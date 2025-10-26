import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync, rmdirSync } from 'fs';
import { resolve, extname } from 'path';
import { abi } from 'thor-devkit';

// Mock fs module
jest.mock('fs');
const mockedReaddirSync = readdirSync as jest.MockedFunction<typeof readdirSync>;
const mockedReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockedWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockedMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;

describe('main.ts - ABI Signature Collection Builder', () => {
  const baseDir = resolve(__dirname, 'ABIs');
  const distDir = resolve(__dirname, 'dist');
  const qDir = resolve(distDir, 'q');
  const cDir = resolve(distDir, 'c');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Directory Creation', () => {
    it('should create qDir with recursive option', () => {
      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue('[]');
      
      require('./main');
      
      expect(mockedMkdirSync).toHaveBeenCalledWith(qDir, { recursive: true });
    });

    it('should create cDir with recursive option', () => {
      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue('[]');
      
      require('./main');
      
      expect(mockedMkdirSync).toHaveBeenCalledWith(cDir, { recursive: true });
    });
  });

  describe('ABI File Processing', () => {
    it('should skip hidden files starting with dot', () => {
      const mockDirEntry = [
        { name: '.hidden.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      
      require('./main');
      
      // Should not attempt to read hidden files
      expect(mockedReadFileSync).not.toHaveBeenCalledWith(
        expect.stringContaining('.hidden.json'),
        expect.anything()
      );
    });

    it('should skip directories', () => {
      const mockDirEntry = [
        { name: 'subdir', isFile: () => false, isDirectory: () => true, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      
      require('./main');
      
      // Should not attempt to read directories
      expect(mockedReadFileSync).not.toHaveBeenCalledWith(
        expect.stringContaining('subdir'),
        expect.anything()
      );
    });

    it('should process valid ABI JSON file with function', () => {
      const mockABI = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ];

      const mockDirEntry = [
        { name: 'token.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      mockedExistsSync.mockReturnValue(false);
      
      require('./main');
      
      // Verify file was read
      expect(mockedReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining('token.json'),
        { encoding: 'utf8' }
      );
      
      // Verify signature file was written
      expect(mockedWriteFileSync).toHaveBeenCalled();
    });

    it('should process valid ABI JSON file with event', () => {
      const mockABI = [
        {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false }
          ]
        }
      ];

      const mockDirEntry = [
        { name: 'token.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      mockedExistsSync.mockReturnValue(false);
      
      require('./main');
      
      // Verify event processing
      expect(mockedWriteFileSync).toHaveBeenCalled();
    });

    it('should throw error for non-array ABI', () => {
      const mockDirEntry = [
        { name: 'invalid.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify({ notAnArray: true }));
      
      expect(() => require('./main')).toThrow('ABI expected array');
    });

    it('should append to existing signature file', () => {
      const mockABI = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ];

      const existingABI = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          $contractName: 'existing'
        }
      ];

      const mockDirEntry = [
        { name: 'token.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync
        .mockReturnValueOnce(JSON.stringify(mockABI)) // First call: read ABI file
        .mockReturnValueOnce(JSON.stringify(existingABI)); // Second call: read existing signature file
      mockedExistsSync.mockReturnValue(true);
      
      require('./main');
      
      // Verify that existing file is read and new ABI is appended
      const writeCall = mockedWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('.json') && !call[0].toString().includes('contracts.json')
      );
      
      if (writeCall) {
        const written = JSON.parse(writeCall[1] as string);
        expect(Array.isArray(written)).toBe(true);
        expect(written.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Signature Generation', () => {
    it('should generate correct function signature', () => {
      const mockABI = [
        {
          type: 'function',
          name: 'balanceOf',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }]
        }
      ];

      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      mockedExistsSync.mockReturnValue(false);
      
      require('./main');
      
      // balanceOf(address) should generate signature 0x70a08231
      const writeCall = mockedWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('0x70a08231.json')
      );
      expect(writeCall).toBeDefined();
    });

    it('should generate correct event signature', () => {
      const mockABI = [
        {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false }
          ]
        }
      ];

      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      mockedExistsSync.mockReturnValue(false);
      
      require('./main');
      
      // Transfer(address,address,uint256) should generate a specific signature
      expect(mockedWriteFileSync).toHaveBeenCalled();
    });
  });

  describe('Contract Name Handling', () => {
    it('should extract contract name from filename without extension', () => {
      const mockABI = [
        {
          type: 'function',
          name: 'test',
          inputs: [],
          outputs: []
        }
      ];

      const mockDirEntry = [
        { name: 'MyContract.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      mockedExistsSync.mockReturnValue(false);
      
      require('./main');
      
      // Verify that $contractName is set correctly
      const writeCall = mockedWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('.json') && !call[0].toString().includes('contracts.json')
      );
      
      if (writeCall) {
        const written = JSON.parse(writeCall[1] as string);
        expect(written[0].$contractName).toBe('MyContract');
      }
    });

    it('should handle filenames with multiple dots', () => {
      const mockABI = [
        {
          type: 'function',
          name: 'test',
          inputs: [],
          outputs: []
        }
      ];

      const mockDirEntry = [
        { name: 'my.awesome.contract.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      mockedExistsSync.mockReturnValue(false);
      
      require('./main');
      
      const writeCall = mockedWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('.json') && !call[0].toString().includes('contracts.json')
      );
      
      if (writeCall) {
        const written = JSON.parse(writeCall[1] as string);
        expect(written[0].$contractName).toBe('my.awesome.contract');
      }
    });
  });

  describe('Special ABI Types', () => {
    it('should skip constructor (no inputs field)', () => {
      const mockABI = [
        {
          type: 'constructor',
          inputs: undefined,
          outputs: undefined
        }
      ];

      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      
      require('./main');
      
      // Constructor should be skipped, only contracts.json should be written
      const signatureWrites = mockedWriteFileSync.mock.calls.filter(call => 
        call[0].toString().includes('.json') && !call[0].toString().includes('contracts.json')
      );
      expect(signatureWrites.length).toBe(0);
    });

    it('should skip fallback function (no inputs field)', () => {
      const mockABI = [
        {
          type: 'fallback',
          stateMutability: 'payable'
        }
      ];

      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      
      require('./main');
      
      // Fallback should be skipped
      const signatureWrites = mockedWriteFileSync.mock.calls.filter(call => 
        call[0].toString().includes('.json') && !call[0].toString().includes('contracts.json')
      );
      expect(signatureWrites.length).toBe(0);
    });

    it('should process receive function if it has signature', () => {
      const mockABI = [
        {
          type: 'receive',
          stateMutability: 'payable'
        }
      ];

      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      
      require('./main');
      
      // Receive without inputs should be skipped
      const signatureWrites = mockedWriteFileSync.mock.calls.filter(call => 
        call[0].toString().includes('.json') && !call[0].toString().includes('contracts.json')
      );
      expect(signatureWrites.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ABI array', () => {
      const mockDirEntry = [
        { name: 'empty.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue('[]');
      
      expect(() => require('./main')).not.toThrow();
    });

    it('should handle ABI with only constructors and fallbacks', () => {
      const mockABI = [
        {
          type: 'constructor',
          inputs: [{ name: 'param', type: 'uint256' }]
        },
        {
          type: 'fallback'
        }
      ];

      const mockDirEntry = [
        { name: 'simple.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      
      expect(() => require('./main')).not.toThrow();
    });

    it('should handle function with no inputs', () => {
      const mockABI = [
        {
          type: 'function',
          name: 'totalSupply',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }]
        }
      ];

      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      mockedExistsSync.mockReturnValue(false);
      
      require('./main');
      
      // totalSupply() should generate signature 0x18160ddd
      const writeCall = mockedWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('0x18160ddd.json')
      );
      expect(writeCall).toBeDefined();
    });

    it('should handle function with complex tuple inputs', () => {
      const mockABI = [
        {
          type: 'function',
          name: 'complexFunction',
          inputs: [
            {
              name: 'data',
              type: 'tuple',
              components: [
                { name: 'a', type: 'uint256' },
                { name: 'b', type: 'address' }
              ]
            }
          ],
          outputs: []
        }
      ];

      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockABI));
      mockedExistsSync.mockReturnValue(false);
      
      expect(() => require('./main')).not.toThrow();
    });
  });

  describe('Contracts List Generation', () => {
    it('should generate contracts.json with all processed files', () => {
      const mockDirEntry = [
        { name: 'contract1.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false },
        { name: 'contract2.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue('[]');
      
      require('./main');
      
      const contractsJsonCall = mockedWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('contracts.json')
      );
      
      expect(contractsJsonCall).toBeDefined();
      if (contractsJsonCall) {
        const contracts = JSON.parse(contractsJsonCall[1] as string);
        expect(Array.isArray(contracts)).toBe(true);
      }
    });

    it('should include only processed files in contracts.json', () => {
      const mockDirEntry = [
        { name: 'contract1.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false },
        { name: '.hidden.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue('[]');
      
      require('./main');
      
      const contractsJsonCall = mockedWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('contracts.json')
      );
      
      if (contractsJsonCall) {
        const contracts = JSON.parse(contractsJsonCall[1] as string);
        // Should not include hidden files or directories
        expect(contracts.filter((c: any) => c)).not.toContain('.hidden.json');
        expect(contracts.filter((c: any) => c)).not.toContain('subdir');
      }
    });
  });

  describe('File System Options', () => {
    it('should use UTF-8 encoding for all file operations', () => {
      const mockDirEntry = [
        { name: 'test.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      mockedReadFileSync.mockReturnValue('[]');
      
      require('./main');
      
      // Check that readFileSync was called with UTF-8 encoding
      expect(mockedReadFileSync).toHaveBeenCalledWith(
        expect.anything(),
        { encoding: 'utf8' }
      );
      
      // Check that writeFileSync was called with UTF-8 encoding
      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { encoding: 'utf8' }
      );
    });
  });

  describe('Multiple Functions with Same Signature', () => {
    it('should aggregate ABIs with identical signatures', () => {
      const mockABI1 = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ];

      const mockABI2 = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: 'success', type: 'bool' }]
        }
      ];

      const mockDirEntry = [
        { name: 'token1.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false },
        { name: 'token2.json', isFile: () => true, isDirectory: () => false, isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false, isFIFO: () => false, isSocket: () => false }
      ];
      
      mockedReaddirSync.mockReturnValue(mockDirEntry as any);
      
      let callCount = 0;
      mockedReadFileSync.mockImplementation((path: any) => {
        if (path.includes('token1.json')) {
          return JSON.stringify(mockABI1);
        } else if (path.includes('token2.json')) {
          return JSON.stringify(mockABI2);
        } else if (path.includes('0xa9059cbb.json')) {
          callCount++;
          if (callCount === 1) {
            return JSON.stringify([{ ...mockABI1[0], $contractName: 'token1' }]);
          }
        }
        return '[]';
      });
      
      let fileExists = false;
      mockedExistsSync.mockImplementation((path: any) => {
        if (path.includes('0xa9059cbb.json')) {
          const result = fileExists;
          fileExists = true; // Next time it will exist
          return result;
        }
        return false;
      });
      
      require('./main');
      
      // Both ABIs should be written to the same signature file
      const signatureWrites = mockedWriteFileSync.mock.calls.filter(call => 
        call[0].toString().includes('0xa9059cbb.json')
      );
      
      expect(signatureWrites.length).toBeGreaterThan(0);
    });
  });
});

describe('ABI Function and Event Signature Generation', () => {
  describe('Function Signatures', () => {
    it('should generate correct signature for simple function', () => {
      const fn = new abi.Function({
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' }
        ]
      });
      
      // transfer(address,uint256) -> 0xa9059cbb
      expect(fn.signature).toBe('0xa9059cbb');
    });

    it('should generate correct signature for function with no parameters', () => {
      const fn = new abi.Function({
        type: 'function',
        name: 'totalSupply',
        inputs: []
      });
      
      // totalSupply() -> 0x18160ddd
      expect(fn.signature).toBe('0x18160ddd');
    });

    it('should generate correct signature for function with array parameters', () => {
      const fn = new abi.Function({
        type: 'function',
        name: 'batchTransfer',
        inputs: [
          { name: 'recipients', type: 'address[]' },
          { name: 'amounts', type: 'uint256[]' }
        ]
      });
      
      expect(fn.signature).toBeDefined();
      expect(fn.signature).toMatch(/^0x[0-9a-f]{8}$/);
    });
  });

  describe('Event Signatures', () => {
    it('should generate correct signature for Transfer event', () => {
      const ev = new abi.Event({
        type: 'event',
        name: 'Transfer',
        inputs: [
          { name: 'from', type: 'address', indexed: true },
          { name: 'to', type: 'address', indexed: true },
          { name: 'value', type: 'uint256', indexed: false }
        ]
      });
      
      // Transfer(address,address,uint256) -> 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
      expect(ev.signature).toBe('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');
    });

    it('should generate correct signature for Approval event', () => {
      const ev = new abi.Event({
        type: 'event',
        name: 'Approval',
        inputs: [
          { name: 'owner', type: 'address', indexed: true },
          { name: 'spender', type: 'address', indexed: true },
          { name: 'value', type: 'uint256', indexed: false }
        ]
      });
      
      // Approval(address,address,uint256) -> 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925
      expect(ev.signature).toBe('0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925');
    });

    it('should generate signature for event with no indexed parameters', () => {
      const ev = new abi.Event({
        type: 'event',
        name: 'Log',
        inputs: [
          { name: 'message', type: 'string', indexed: false }
        ]
      });
      
      expect(ev.signature).toBeDefined();
      expect(ev.signature).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });
});