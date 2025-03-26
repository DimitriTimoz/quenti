declare module 'cookie' {
  export function serialize(name: string, value: string, options?: {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
  }): string;
} 