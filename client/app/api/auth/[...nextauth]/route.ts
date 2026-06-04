import { handlers } from "../../../../auth";

// Vercel default function timeout is 10s on Hobby. When Render's free-tier
// backend is cold-starting, NextAuth's credentials authorize() can take
// 30-60s to call /api/auth/login. Bumping this to 60s prevents the function
// from being killed before the backend wakes up.
export const maxDuration = 60;

export const { GET, POST } = handlers;
