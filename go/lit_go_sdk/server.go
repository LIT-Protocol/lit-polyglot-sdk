package lit_go_sdk

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// NodeServer manages the Node.js server process
type NodeServer struct {
	port    int
	cmd     *exec.Cmd
	logFile *os.File
}

// NewNodeServer creates a new instance of NodeServer
func NewNodeServer(port int) *NodeServer {
	return &NodeServer{
		port: port,
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

	// Create log file
	var logFile *os.File
	if os.Getenv("LIT_DEBUG_JS_SDK_SERVER") != "" {
		var err error
		logFile, err = os.OpenFile(filepath.Join(sdkDir, "server.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			return fmt.Errorf("failed to create log file: %w", err)
		}
	}
	s.logFile = logFile

	// Prepare the command
	s.cmd = exec.Command("node", serverPath)
	s.cmd.Stdout = logFile
	s.cmd.Stderr = logFile
	s.cmd.Env = append(os.Environ(), fmt.Sprintf("PORT=%d", s.port))
	s.cmd.Dir = sdkDir

	// Start the process
	if err := s.cmd.Start(); err != nil {
		s.logFile.Close()
		return fmt.Errorf("failed to start Node.js server: %w", err)
	}

	return nil
}

// Stop stops the Node.js server process
func (s *NodeServer) Stop() error {
	if s.cmd != nil && s.cmd.Process != nil {
		if err := s.cmd.Process.Kill(); err != nil {
			return fmt.Errorf("failed to kill server process: %w", err)
		}
		s.cmd.Wait()
		s.cmd = nil
	}

	if s.logFile != nil {
		if err := s.logFile.Close(); err != nil {
			return fmt.Errorf("failed to close log file: %w", err)
		}
		s.logFile = nil
	}

	return nil
}
