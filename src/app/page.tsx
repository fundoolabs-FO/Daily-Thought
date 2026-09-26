import { redirect } from "next/navigation";

// The proxy sends signed-out visitors from /today to /login.
export default function Home() {
  redirect("/today");
}
