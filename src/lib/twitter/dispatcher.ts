import { postTweet } from './apex-client';
import {
  getUntweetedAlerts,
  getLeaderboard,
  getWallet,
  isTweetLogged,
  insertTweetLog,
} from '@/lib/db/queries';

const APP_URL = 'https://insider-terminal.vercel.app';

function formatAlertTweet(
  address: string,
  username: string | null,
  score: number,
  alertType: string,
): string {
  const band = alertType === 'EXTREME' ? '🚨 EXTREME' : '⚠️ HIGH';
  const displayName = username ?? `${address.slice(0, 6)}...${address.slice(-4)}`;
  return [
    `${band} ALERT | Insider Score ${score}/100`,
    ``,
    `Wallet: ${displayName}`,
    ``,
    `${APP_URL}/wallet/${address}`,
  ].join('\n');
}

function formatLeaderboardTweet(
  wallets: Array<{ username: string | null; address: string; total_score: number }>,
): string {
  const medals = ['🥇', '🥈', '🥉'];
  const lines = wallets.map((w, i) => {
    const name = w.username ?? `${w.address.slice(0, 6)}...${w.address.slice(-4)}`;
    return `${medals[i]} ${name} — ${w.total_score}/100`;
  });
  return [
    `📊 Daily Insider Leaderboard`,
    ``,
    ...lines,
    ``,
    `${APP_URL}/leaderboard`,
  ].join('\n');
}

async function dispatchAlertTweets(): Promise<number> {
  const alerts = await getUntweetedAlerts();
  let posted = 0;

  for (const alert of alerts) {
    const refId = String(alert.id);

    if (await isTweetLogged('alert', refId)) continue;

    const wallet = await getWallet(alert.wallet_address);
    const text = formatAlertTweet(
      alert.wallet_address,
      wallet?.username ?? null,
      alert.score_at_time ?? 0,
      alert.alert_type,
    );

    try {
      const result = await postTweet(text);
      await insertTweetLog({
        tweet_type: 'alert',
        ref_id: refId,
        tweet_id: result.id,
        tweet_text: text,
        status: 'sent',
      });
      posted++;
    } catch (err) {
      console.error(`[twitter] Failed to tweet alert ${alert.id}:`, err);
      await insertTweetLog({
        tweet_type: 'alert',
        ref_id: refId,
        tweet_id: null,
        tweet_text: text,
        status: 'failed',
      });
    }
  }

  return posted;
}

async function dispatchLeaderboardTweet(): Promise<boolean> {
  const now = new Date();
  const pstHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    }).format(now),
  );
  const pstDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(now); // YYYY-MM-DD
  const refId = `daily-${pstDate}`;

  if (pstHour < 9) return false;
  if (await isTweetLogged('leaderboard', refId)) return false;

  const wallets = await getLeaderboard(3, 0);
  if (wallets.length === 0) return false;

  const text = formatLeaderboardTweet(
    wallets.map((w) => ({
      username: w.username,
      address: w.address,
      total_score: w.total_score,
    })),
  );

  try {
    const result = await postTweet(text);
    await insertTweetLog({
      tweet_type: 'leaderboard',
      ref_id: refId,
      tweet_id: result.id,
      tweet_text: text,
      status: 'sent',
    });
    return true;
  } catch (err) {
    console.error(`[twitter] Failed to post leaderboard:`, err);
    await insertTweetLog({
      tweet_type: 'leaderboard',
      ref_id: refId,
      tweet_id: null,
      tweet_text: text,
      status: 'failed',
    });
    return false;
  }
}

export async function dispatchTweets(): Promise<{
  alertsTweeted: number;
  leaderboardTweeted: boolean;
}> {
  if (!process.env.APEX_API_TOKEN) {
    return { alertsTweeted: 0, leaderboardTweeted: false };
  }

  const [alertsTweeted, leaderboardTweeted] = await Promise.all([
    dispatchAlertTweets(),
    dispatchLeaderboardTweet(),
  ]);

  return { alertsTweeted, leaderboardTweeted };
}
