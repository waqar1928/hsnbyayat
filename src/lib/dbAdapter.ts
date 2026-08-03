import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Builds the MariaDB driver adapter from env vars. Normally DATABASE_URL
// (a plain mysql://user:pass@host:port/db string) is all that's needed.
//
// Some shared hosts (Hostinger among them) only grant the database user
// access from `@localhost` — which MySQL treats as "via the local Unix
// socket", not "any TCP connection that resolves to the local machine".
// Node MySQL/MariaDB drivers connect over TCP even when given "localhost"
// as the host, so they hit that socket-only restriction and get rejected
// with what looks like a bad-password error even though the credentials
// are correct. If the host's control panel won't let you add a matching
// TCP-host grant, connecting via the same Unix socket the mysql CLI uses
// sidesteps the whole problem. Set DATABASE_SOCKET_PATH (e.g.
// /var/lib/mysql/mysql.sock or /tmp/mysql.sock — check `SHOW VARIABLES
// LIKE 'socket'` on the server) to switch to that mode; user/password/
// database are still pulled out of DATABASE_URL either way.
export function createMariaDbAdapter(): PrismaMariaDb {
  const url = process.env.DATABASE_URL || "";
  const socketPath = process.env.DATABASE_SOCKET_PATH;

  if (!socketPath) {
    return new PrismaMariaDb(url);
  }

  const parsed = new URL(url);
  return new PrismaMariaDb({
    socketPath,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  });
}
