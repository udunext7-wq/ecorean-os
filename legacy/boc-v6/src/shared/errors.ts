export const VERSION = '1.0.0'; // TODO: 구현 예정

export class EcoreanError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'EcoreanError';
  }
}

export class ValidationError extends EcoreanError {
  constructor(message: string, public readonly field?: string) {
    super('VALIDATION_ERROR', message, { field });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends EcoreanError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} '${id}' 를 찾을 수 없습니다.`, { resource, id });
    this.name = 'NotFoundError';
  }
}

export class CalculationError extends EcoreanError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CALCULATION_ERROR', message, context);
    this.name = 'CalculationError';
  }
}
