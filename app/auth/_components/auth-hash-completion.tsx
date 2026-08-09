"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthHashCompletion() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    let active = true;
    createClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (!active) return;
        if (error) {
          setMessage("Your email is confirmed. Sign in below with the password you created.");
          return;
        }
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        window.location.replace("/today");
      });
    return () => { active = false; };
  }, []);

  return message ? <p role="status" className="mt-5 rounded-xl bg-[#eef7f1] px-4 py-3 text-sm leading-6 text-[#315847]">{message}</p> : null;
}
