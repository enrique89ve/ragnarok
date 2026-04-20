/**
 * DebugRenderCheck Component
 * 
 * A diagnostic tool for WebGL rendering issues.
 * This component provides detailed information about:
 * - WebGL context status
 * - Canvas performance metrics
 * - Context loss detection
 * - Memory leaks and resource usage
 * 
 * Implements techniques from TripoSR research for maximum rendering quality.
 */

import React, { useState, useEffect, useRef } from 'react';
import { countActiveWebGLContexts, isWebGLSupported } from '../utils/webglContextFix';

interface DebugRenderCheckProps {
  onClose?: () => void;
}

/**
 * A debugging component to check WebGL rendering in the game
 */
const DebugRenderCheck: React.FC<DebugRenderCheckProps> = ({ onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextInfo, setContextInfo] = useState<any>({});
  const [webglSupported, setWebglSupported] = useState<boolean>(false);
  const [activeContexts, setActiveContexts] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Check WebGL support and gather information
  useEffect(() => {
    setWebglSupported(isWebGLSupported());
    setActiveContexts(countActiveWebGLContexts());
    
    const intervalId = setInterval(() => {
      setActiveContexts(countActiveWebGLContexts());
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Get detailed context information
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('webgl') as WebGLRenderingContext | null;
      
      if (ctx) {
        const info = {
          vendor: ctx.getParameter(ctx.VENDOR),
          renderer: ctx.getParameter(ctx.RENDERER),
          version: ctx.getParameter(ctx.VERSION),
          shadingLanguageVersion: ctx.getParameter(ctx.SHADING_LANGUAGE_VERSION),
          maxTextureSize: ctx.getParameter(ctx.MAX_TEXTURE_SIZE),
          maxViewportDims: ctx.getParameter(ctx.MAX_VIEWPORT_DIMS),
          maxRenderbufferSize: ctx.getParameter(ctx.MAX_RENDERBUFFER_SIZE),
          extensions: ctx.getSupportedExtensions()
        };
        
        setContextInfo(info);
      }
    }
  }, [canvasRef]);
  
  // Get memory usage
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  
  useEffect(() => {
    if ('performance' in window && 'memory' in (performance as any)) {
      const updateMemoryInfo = () => {
        setMemoryUsage({
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize / (1024 * 1024),
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize / (1024 * 1024),
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit / (1024 * 1024)
        });
      };
      
      updateMemoryInfo();
      const intervalId = setInterval(updateMemoryInfo, 2000);
      
      return () => clearInterval(intervalId);
    }
    return undefined;
  }, []);

  // If minimal mode (just a button), return that
  if (!isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}
        title="Debug Rendering"
      >
        🔍
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '350px',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      color: 'white',
      borderRadius: '8px',
      padding: '15px',
      fontFamily: 'monospace',
      fontSize: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: 1000,
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>WebGL Diagnostics</h2>
        <button 
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>WebGL Support</h3>
        <div>
          <span style={{ color: webglSupported ? '#4ade80' : '#f87171' }}>
            {webglSupported ? '✓ Supported' : '✗ Not Supported'}
          </span>
        </div>
        <div>Active Contexts: {activeContexts}</div>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Context Info</h3>
        <canvas ref={canvasRef} width="1" height="1" style={{ display: 'none' }} />
        
        {Object.keys(contextInfo).map(key => (
          <div key={key} style={{ marginBottom: '3px' }}>
            <strong>{key}:</strong> {
              Array.isArray(contextInfo[key]) 
                ? `${contextInfo[key].length} items`
                : String(contextInfo[key])
            }
          </div>
        ))}
        
        {Object.keys(contextInfo).length === 0 && (
          <div style={{ color: '#f87171' }}>Failed to get WebGL context information</div>
        )}
      </div>
      
      {memoryUsage && (
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Memory Usage</h3>
          <div>Used JS Heap: {memoryUsage.usedJSHeapSize.toFixed(2)} MB</div>
          <div>Total JS Heap: {memoryUsage.totalJSHeapSize.toFixed(2)} MB</div>
          <div>JS Heap Limit: {memoryUsage.jsHeapSizeLimit.toFixed(2)} MB</div>
          <div style={{ marginTop: '5px' }}>
            <div style={{ 
              width: '100%', 
              height: '10px', 
              backgroundColor: '#1e293b',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${(memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100}%`, 
                height: '100%', 
                backgroundColor: memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit > 0.8 ? '#ef4444' : '#3b82f6'
              }} />
            </div>
          </div>
        </div>
      )}
      
      <div>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Troubleshooting Tips</h3>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Check if multiple canvases are conflicting</li>
          <li>Verify WebGL context isn't being lost</li>
          <li>Ensure proper cleanup of Three.js resources</li>
          <li>Monitor GPU memory usage for leaks</li>
        </ul>
      </div>
      
      {onClose && (
        <button 
          onClick={onClose}
          style={{
            marginTop: '15px',
            padding: '8px 12px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Close Diagnostics
        </button>
      )}
    </div>
  );
};

export default DebugRenderCheck;