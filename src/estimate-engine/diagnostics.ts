export const VERSION = '1.0.0'; // TODO: 구현 예정

export type DiagnosticLevel = 'info' | 'warning' | 'error';

export interface Diagnostic {
  code: string;
  level: DiagnosticLevel;
  message: string;
  field?: string;
}

export class DiagnosticsEngine {
  private items: Diagnostic[] = [];

  add(item: Diagnostic): void {
    this.items.push(item);
  }

  warn(code: string, message: string, field?: string): void {
    this.add({ code, level: 'warning', message, field });
  }

  error(code: string, message: string, field?: string): void {
    this.add({ code, level: 'error', message, field });
  }

  hasErrors(): boolean {
    return this.items.some((d) => d.level === 'error');
  }

  getAll(): Diagnostic[] {
    return [...this.items];
  }

  clear(): void {
    this.items = [];
  }
}
