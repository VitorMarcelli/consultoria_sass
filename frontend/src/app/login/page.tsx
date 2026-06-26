import LoginClient from './LoginClient';

export default async function LoginPage(props: { searchParams: Promise<{ error?: string; revoked?: string }> }) {
  const searchParams = await props.searchParams;
  
  return <LoginClient error={searchParams?.error} revoked={searchParams?.revoked === 'true'} />;
}
