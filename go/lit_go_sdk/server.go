package lit_go_sdk

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
)

const maxBufferSize = 32 * 1024 * 1024 // 32MB in bytes

// min returns the smaller of x or y
func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}

// rotatingBuffer implements a circular buffer that maintains the last maxBufferSize bytes
type rotatingBuffer struct {
	buffer []byte
	pos    int
	size   int
	mu     sync.RWMutex
}

// newRotatingBuffer creates a new rotating buffer with the specified max size
func newRotatingBuffer() *rotatingBuffer {
	return &rotatingBuffer{
		buffer: make([]byte, maxBufferSize),
	}
}

// Write implements io.Writer interface
func (b *rotatingBuffer) Write(p []byte) (n int, err error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	n = len(p)
	if n > maxBufferSize {
		// If the input is larger than buffer, only keep the last maxBufferSize bytes
		p = p[n-maxBufferSize:]
		n = len(p)
	}

	// First copy
	copied := copy(b.buffer[b.pos:], p)
	if copied < n {
		// If we hit the end of the buffer, wrap around
		copy(b.buffer, p[copied:])
		b.pos = n - copied
	} else {
		b.pos = (b.pos + n) % maxBufferSize
	}

	// Update size
	b.size = min(b.size+n, maxBufferSize)
	return n, nil
}

// String returns the contents of the buffer as a string
func (b *rotatingBuffer) String() string {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if b.size < maxBufferSize {
		return string(b.buffer[:b.size])
	}

	// Combine the two parts of the circular buffer
	result := make([]byte, maxBufferSize)
	copy(result, b.buffer[b.pos:])
	copy(result[maxBufferSize-b.pos:], b.buffer[:b.pos])
	return string(result)
}

// NodeServer manages the Node.js server process
type NodeServer struct {
	port int
	cmd  *exec.Cmd
	logs *rotatingBuffer
}

// NewNodeServer creates a new instance of NodeServer
func NewNodeServer(port int) *NodeServer {
	return &NodeServer{
		port: port,
		logs: newRotatingBuffer(),
	}
}

// Start starts the Node.js server process
func (s *NodeServer) Start() error {
	if s.cmd != nil {
		return nil
	}

	// Get the directory where the current Go file is located
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return fmt.Errorf("failed to get current file path")
	}
	sdkDir := filepath.Dir(filename)

	// Path to the bundled server
	serverPath := filepath.Join(sdkDir, "bundled_server.js")
	if _, err := os.Stat(serverPath); os.IsNotExist(err) {
		return fmt.Errorf("bundled server not found at %s: this is likely an installation issue", serverPath)
	}

	// Create a multiwriter to write to both stderr and our rotating buffer
	var writers []io.Writer
	writers = append(writers, s.logs)

	if os.Getenv("LIT_DEBUG_JS_SDK_SERVER") != "" {
		// Also write to stderr for debug mode
		writers = append(writers, os.Stderr)
	}

	multiWriter := io.MultiWriter(writers...)

	// Prepare the command
	s.cmd = exec.Command("node", serverPath)
	s.cmd.Stdout = multiWriter
	s.cmd.Stderr = multiWriter
	s.cmd.Env = append(os.Environ(), fmt.Sprintf("PORT=%d", s.port))
	s.cmd.Dir = sdkDir

	// Start the process
	if err := s.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start Node.js server: %w", err)
	}

	// Monitor the process in a goroutine
	go func() {
		err := s.cmd.Wait()
		if err != nil {
			fmt.Printf("\n=== Node.js Server Crashed ===\nError: %v\n", err)

			fmt.Println(s.logs.String())
			fmt.Println("=== End Server Logs ===")
		}
	}()

	return nil
}

// Stop stops the Node.js server process
func (s *NodeServer) Stop() error {
	if s.cmd != nil && s.cmd.Process != nil {
		if err := s.cmd.Process.Kill(); err != nil {
			return fmt.Errorf("failed to kill server process: %w", err)
		}
		s.cmd = nil
	}
	return nil
}

// GetLogs returns the current contents of the log buffer
func (s *NodeServer) GetLogs() string {
	return s.logs.String()
}
