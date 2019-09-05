The "cache" branch includes a partiall-implemented (but aborted) feature that
incorporates a persisted analysis cache. It was abandoned because of its 
complexity and because it didn't prove to be sufficiently faster than reanalysis.

The "brain" repo takes about 19 sec to analyze from scratch, and with the cache,
it still took about 7 sec to load. That was at the cost of nearly 100MB of disk
space and a huge amount of added complexity in the pyright source base.

Here are the things that would need to be addressed if I ever decide to pick
this up again:


* Deal with dependencies that are no longer valid - the current implementation 
  doesn't record hashes of any dependent source files. A real implementation would
  need to store the hashes for the full transitive closure.
* Add tests for caching - there are no unit tests currently
* Perf tuning (async writes) - all writes to the cache are currently sync
* Add switch for enabling/disabling caching
* Solve Find Reference problem - the "Find References" and "Rename Symbol"
  features rely on having the full parse trees available. 
* Figure out how to make tmp directory work on windows - the current code assumes
  we can write to "/tmp/X", which is valid only on UNIX-based OSes.
* Figure out how to delete files - I couldn't figure out how to delete
  individual files using node's fs module, so the cache doesn't delete corrupt
  files currently.
* The current implementation uses a hash of the full config file contents as a
  key for the cache. For perf reasons, this should probably be more selective.

