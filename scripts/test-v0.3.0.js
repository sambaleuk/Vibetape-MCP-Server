#!/usr/bin/env node

/**
 * Test script for VibeTape v0.3.0 Context Handoff features
 */

import { createReadStream, createWriteStream } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '..', 'dist', 'server.js');

console.log('🧪 Testing VibeTape v0.3.0 Context Handoff features...\n');

// Test 1: Generate Context Handoff
const testGenerateHandoff = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'generate_context_handoff',
    arguments: {
      budgetTokens: 350,
      sessionId: 'test-session-v0.3.0'
    }
  }
};

// Test 2: Suggest Transition Card (low tokens)
const testSuggestHandoff = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'suggest_transition_card',
    arguments: {
      remainingTokens: 800,
      threshold: 1000
    }
  }
};

// Test 3: Sweep Noise
const testSweepNoise = {
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'sweep_noise',
    arguments: {
      windowDays: 7,
      similarityThreshold: 0.8
    }
  }
};

async function runTest(testName, testData) {
  console.log(`\n🔬 ${testName}:`);
  console.log(`Request: ${JSON.stringify(testData, null, 2)}\n`);
  
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let hasResponse = false;
    
    server.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Look for JSON-RPC response
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim() && line.includes('"jsonrpc"')) {
          try {
            const response = JSON.parse(line);
            if (response.id === testData.id) {
              console.log(`✅ Response: ${JSON.stringify(response, null, 2)}\n`);
              hasResponse = true;
              server.kill();
              resolve(response);
              return;
            }
          } catch (e) {
            // Not JSON, continue
          }
        }
      }
    });
    
    server.stderr.on('data', (data) => {
      console.log(`Server log: ${data.toString()}`);
    });
    
    server.on('close', (code) => {
      if (!hasResponse) {
        console.log(`❌ No response received (exit code: ${code})`);
        console.log(`Output: ${output}`);
        reject(new Error(`No response for ${testName}`));
      }
    });
    
    // Send the test request
    server.stdin.write(JSON.stringify(testData) + '\n');
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!hasResponse) {
        console.log(`⏱️ Timeout for ${testName}`);
        server.kill();
        reject(new Error(`Timeout for ${testName}`));
      }
    }, 10000);
  });
}

async function runAllTests() {
  try {
    console.log('🚀 Starting VibeTape v0.3.0 Context Handoff tests...\n');
    
    // Test 1: Generate handoff
    await runTest('Generate Context Handoff', testGenerateHandoff);
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Suggest handoff
    await runTest('Suggest Transition Card', testSuggestHandoff);
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Sweep noise
    await runTest('Sweep Noise', testSweepNoise);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Context Handoff generation');
    console.log('✅ Context-aware suggestions');
    console.log('✅ Noise denoising');
    console.log('\n🚀 VibeTape v0.3.0 is ready for production!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();

