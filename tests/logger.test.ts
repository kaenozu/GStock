import { describe, it, expect, vi } from 'vitest';
import { logger } from '../src/lib/logger';

describe('Logger', () => {
    it('should format log entries correctly', () => {
        const consoleSpy = vi.spyOn(console, 'info');

        logger.info('Test message', { foo: 'bar' });

        expect(consoleSpy).toHaveBeenCalled();
        const args = consoleSpy.mock.calls[0];
        const output = args.join(' ');

        // Check if output contains message and context
        expect(output).toContain('Test message');
        expect(output).toContain('{"foo":"bar"}');

        consoleSpy.mockRestore();
    });

    it('should handle errors correctly', () => {
        const consoleSpy = vi.spyOn(console, 'error');
        const testError = new Error('Something exploded');

        logger.error('Error occurred', testError);

        expect(consoleSpy).toHaveBeenCalled();
        const args = consoleSpy.mock.calls[0];
        const output = args.join(' ');

        expect(output).toContain('Error occurred');
        expect(output).toContain('Something exploded');

        consoleSpy.mockRestore();
    });
});
