#!/usr/bin/env node

// Test script to validate atomic writes and merge functionality
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'vibetape-test-' + Date.now());
const testFile = path.join(testDir, 'test_state.json');

console.log('🧪 Testing VibeTape atomic writes and merge logic...');

async function testAtomicWrites() {
  try {
    // Setup test environment
    process.env.VIBETAPE_HOME = testDir;
    
    // Import Store after setting env
    const { Store } = await import('../dist/store.js');
    
    console.log('✅ Store imported successfully');
    
    // Test 1: Add a moment
    const moment1 = {
      id: 'test-moment-1',
      ts: Date.now(),
      title: 'Test atomic write',
      kind: 'win',
      tags: ['test'],
      text: 'Testing atomic writes functionality'
    };
    
    await Store.addMoment(moment1);
    console.log('✅ Moment added successfully');
    
    // Test 2: Verify state file exists and is valid JSON
    const stateContent = await fs.readFile(path.join(testDir, 'state.json'), 'utf8');
    const state = JSON.parse(stateContent);
    
    if (state.version !== 2) {
      throw new Error('State version should be 2');
    }
    
    if (!state.moments || state.moments.length !== 1) {
      throw new Error('Should have exactly 1 moment');
    }
    
    if (state.moments[0].origin !== 'local') {
      throw new Error('Moment should have origin=local');
    }
    
    if (!state.moments[0].modified_ts) {
      throw new Error('Moment should have modified_ts');
    }
    
    console.log('✅ State structure is correct');
    
    // Test 3: Add relation and verify modified_ts updates
    const originalModifiedTs = state.moments[0].modified_ts;
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    
    await Store.addRelation('test-moment-1', {
      to: 'test-moment-2',
      kind: 'relates',
      note: 'Test relation'
    });
    
    const updatedState = JSON.parse(await fs.readFile(path.join(testDir, 'state.json'), 'utf8'));
    const updatedMoment = updatedState.moments[0];
    
    if (updatedMoment.modified_ts <= originalModifiedTs) {
      throw new Error('modified_ts should be updated when adding relation');
    }
    
    if (!updatedMoment.relations || updatedMoment.relations.length !== 1) {
      throw new Error('Should have exactly 1 relation');
    }
    
    console.log('✅ Relations and modified_ts work correctly');
    
    // Test 4: List moments
    const moments = await Store.listMoments();
    if (moments.length !== 1) {
      throw new Error('Should list exactly 1 moment');
    }
    
    console.log('✅ List moments works correctly');
    
    console.log('🎉 All atomic write tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log('🧹 Cleanup completed');
    } catch (e) {
      console.warn('⚠️  Cleanup warning:', e.message);
    }
  }
}

testAtomicWrites();
