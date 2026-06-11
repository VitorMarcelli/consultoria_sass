import LoginClient from './LoginClient';

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  
  return <LoginClient error={searchParams?.error} />;
}
