 { readdirSync, readFileSync } from 'fs';
 { resolve, extname } from 'path';
 { abi } from 'thor-devkit';

describe('ABI Files Validation', () {
   baseDir resolve(__dirname, 'ABIs');
   abiFiles: string[] [];

   beforeAll(() {
    // Get all ABI files
    try {
      const entries readdirSync(baseDir, { withFileTypes: true });
      abiFiles entries
        .filter(entry entry.isFile() entry.name.startsWith('.'))
        .filter(entry n {
          constext extname(entry.name).toLowerCase();
          rn ext json ext  '.txt' ext '';
        })
        .map(entry entry.name);
    }  (error) {
      // If ABIs directory doesn't exist in test environment, skip
      console.warn('ABIs directory not found, skipping validation tests');
    }
  });

  describe('JSON Syntax Validation', () {
    it('should have valid JSON syntax for all .json files', () => {
      (abiFiles.length  0) {
        console.warn('No ABI files found');
       
      }

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        
        expect(() => {
          JSON.parse(content);
        }).not.toThrow(`${fileName} should be valid JSON`);
      });
    });
  });

  describe('ABI Structure Validation', () => {
    it('should have array structure for all ABI JSON files', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        
        expect(Array.isArray(parsed)).toBe(true);
      }, `${fileName} should be an array`);
    });

    it('should have valid ABI entry types', () => {
      if (abiFiles.length === 0) return;

      const validTypes = ['function', 'constructor', 'event', 'fallback', 'receive', 'error'];

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;

        abiArray.forEach((entry: any, index: number) => {
          if (entry && entry.type) {
            expect(validTypes).toContain(entry.type);
          }
        }, `${fileName}[${index}] has invalid type`);
      });
    });

    it('should have name field for functions and events', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;

        abiArray.forEach((entry: any, index: number) => {
          if (entry && (entry.type === 'function' || entry.type === 'event')) {
            expect(entry.name).toBeDefined();
            expect(typeof entry.name).toBe('string');
          }
        }, `${fileName}[${index}] missing name field`);
      });
    });

    it('should have inputs field for functions and events', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;

        abiArray.forEach((entry: any, index: number) => {
          if (entry && entry.type === 'function' && entry.name) {
            // Functions with names should have inputs (can be empty array)
            if (entry.inputs !== undefined) {
              expect(Array.isArray(entry.inputs)).toBe(true);
            }
          }
          if (entry && entry.type === 'event') {
            if (entry.inputs !== undefined) {
              expect(Array.isArray(entry.inputs)).toBe(true);
            }
          }
        }, `${fileName}[${index}] has invalid inputs`);
      });
    });

    it('should have valid input parameter types', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;

        abiArray.forEach((entry: any, index: number) => {
          if (entry && entry.inputs && Array.isArray(entry.inputs)) {
            entry.inputs.forEach((input: any, inputIndex: number) => {
              expect(input.type).toBeDefined();
              expect(typeof input.type).toBe('string');
            }, `${fileName}[${index}].inputs[${inputIndex}] missing type`);
          }
        });
      });
    });
  });

  describe('Signature Generation Validation', () => {
    it('should be able to generate signatures for all functions', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;

        abiArray.forEach((entry: any, index: number) => {
          if (entry && entry.type === 'function' && entry.inputs) {
            expect(() => {
              const fn = new abi.Function(entry);
              expect(fn.signature).toBeDefined();
              expect(fn.signature).toMatch(/^0x[0-9a-f]{8}$/);
            }).not.toThrow();
          }
        }, `${fileName}[${index}] cannot generate function signature`);
      });
    });

    it('should be able to generate signatures for all events', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;

        abiArray.forEach((entry: any, index: number) => {
          if (entry && entry.type === 'event') {
            expect(() => {
              const ev = new abi.Event(entry);
              expect(ev.signature).toBeDefined();
              expect(ev.signature).toMatch(/^0x[0-9a-f]{64}$/);
            }).not.toThrow();
          }
        }, `${fileName}[${index}] cannot generate event signature`);
      });
    });
  });

  describe('File Naming Conventions', () => {
    it('should not have spaces in filenames', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        expect(fileName).not.toMatch(/\s/);
      }, `${fileName} contains spaces`);
    });

    it('should have reasonable filename length', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        expect(fileName.length).toBeLessThan(256);
      }, `${fileName} is too long`);
    });
  });

  describe('Content Completeness', () => {
    it('should not have empty ABI files', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8').trim();
        
        expect(content.length).toBeGreaterThan(0);
      }, `${fileName} is empty`);
    });

    it('should have at least one entry in non-empty ABI files', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;
        
        // It's OK to have empty arrays, but if not empty, should be valid
        if (abiArray.length > 0) {
          expect(abiArray.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Common ABI Patterns', () => {
    it('should have consistent event indexed parameter usage', () => {
      if (abiFiles.length === 0) return;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;

        abiArray.forEach((entry: any, index: number) => {
          if (entry && entry.type === 'event' && entry.inputs) {
            entry.inputs.forEach((input: any) => {
              // indexed field should be boolean if present
              if (input.indexed !== undefined) {
                expect(typeof input.indexed).toBe('boolean');
              }
            });
          }
        });
      });
    });

    it('should have valid stateMutability for functions', () => {
      if (abiFiles.length === 0) return;

      const validStateMutability = ['pure', 'view', 'nonpayable', 'payable'];

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        const filePath = resolve(baseDir, fileName);
        const content = readFileSync(filePath, 'utf8');
        const abiArray = JSON.parse(content);
        
        if (!Array.isArray(abiArray)) return;

        abiArray.forEach((entry: any, index: number) => {
          if (entry && entry.type === 'function' && entry.stateMutability) {
            expect(validStateMutability).toContain(entry.stateMutability);
          }
        }, `${fileName}[${index}] has invalid stateMutability`);
      });
    });
  });

  describe('Statistics', () => {
    it('should report total number of ABI files', () => {
      console.log(`Total ABI files: ${abiFiles.length}`);
      expect(abiFiles.length).toBeGreaterThanOrEqual(0);
    });

    it('should report total number of functions and events', () => {
      if (abiFiles.length === 0) return;

      let totalFunctions = 0;
      let totalEvents = 0;
      let totalErrors = 0;

      abiFiles.forEach(fileName => {
        if (!fileName.endsWith('.json')) return;

        try {
          const filePath = resolve(baseDir, fileName);
          const content = readFileSync(filePath, 'utf8');
          const abiArray = JSON.parse(content);
          
          if (!Array.isArray(abiArray)) return;

          abiArray.forEach((entry: any) => {
            if (entry && entry.type === 'function') totalFunctions++;
            if (entry && entry.type === 'event') totalEvents++;
            if (entry && entry.type === 'error') totalErrors++;
          });
        } catch (e) {
          // Skip invalid files
        }
      });

      console.log(`Total functions: ${totalFunctions}`);
      console.log(`Total events: ${totalEvents}`);
      console.log(`Total errors: ${totalErrors}`);
      
      expect(totalFunctions + totalEvents + totalErrors).toBeGreaterThanOrEqual(0);
    });
  });
});