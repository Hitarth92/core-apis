import { extractErrorMessage } from './extract-error-message';

describe('extractErrorMessage', () => {
  it('returns plain string responses', () => {
    expect(extractErrorMessage('Organization is required')).toBe('Organization is required');
  });

  it('returns message from standard HttpException body', () => {
    expect(
      extractErrorMessage({
        statusCode: 403,
        message: 'Organization is required. Complete onboarding first.',
        error: 'Forbidden',
      }),
    ).toBe('Organization is required. Complete onboarding first.');
  });

  it('joins validation message arrays', () => {
    expect(
      extractErrorMessage({
        statusCode: 400,
        message: ['email must be an email', 'name should not be empty'],
        error: 'Bad Request',
      }),
    ).toBe('email must be an email; name should not be empty');
  });

  it('formats structured validation errors', () => {
    expect(
      extractErrorMessage({
        statusCode: 400,
        error: 'INVALID_INPUT',
        errors: [
          { field: 'email', message: 'must be an email' },
          { field: 'name', message: 'should not be empty' },
        ],
      }),
    ).toBe('email: must be an email; name: should not be empty');
  });

  it('uses rpc-style message over generic error label', () => {
    expect(
      extractErrorMessage({
        statusCode: 500,
        message: 'duplicate key value violates unique constraint',
        error: 'Database Error',
      }),
    ).toBe('duplicate key value violates unique constraint');
  });
});
