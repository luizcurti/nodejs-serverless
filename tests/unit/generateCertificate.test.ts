describe('generateCertificate', () => {
  // Simple test to verify the function exists and can be imported
  it('should be defined', () => {
    // This test verifies that we can at least import the function
    expect(typeof require('../../src/functions/generateCertificate').handler).toBe('function');
  });

  it('should handle invalid JSON in request body', async () => {
    const { handler } = require('../../src/functions/generateCertificate');
    const mockEvent = {
      body: 'invalid json',
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    await expect(
      handler(mockEvent, mockContext, mockCallback)
    ).rejects.toThrow();
  });
});