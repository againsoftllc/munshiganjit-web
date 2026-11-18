import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = { title: 'Register Account' };

export default function RegisterPage() {
  return <RegisterClient />;
}
