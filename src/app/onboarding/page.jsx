import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import OnboardingForm from "./form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }


  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle(); 

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <div className=" min-h-[calc(100vh-73px)] flex items-center justify-center p-4">
      <main className="container max-w-xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold text-blue-500 sm:text-5xl">
          Choose Your name!
        </h1>
        <p className="mt-4 text-lg text-neutral-900">
          This will be your username and you can't change it!
        </p>
        <p className="mt-2 text-sm text-neutral-900">
          Your profile will be  at: <code>/u/your-name</code>
        </p>

        <OnboardingForm />
      </main>
    </div>
  );
}
