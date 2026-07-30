# Discovery reliability update

This version keeps the known-working Discovery Lab launcher, static mapping preview, output engine, and output API architecture.

Quick discovery now:

1. Uses a separate ephemeral UDP socket and requests unicast mDNS responses, avoiding common Windows port 5353 conflicts.
2. Also listens on multicast port 5353 when Windows permits it.
3. Re-sends WLED and HTTP service queries every 700 ms for approximately 4.2 seconds.
4. Runs Art-Net ArtPoll in parallel.
5. If no WLED device is found, performs a fast local /24 WLED JSON API verification automatically.
6. Merges and deduplicates all results by IP address.

The Deep WLED Scan button still always verifies the entire local /24.
