// app/sign-up/[[...sign-up]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn/>
    </div>
  );
}