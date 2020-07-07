# Source: https://hg.python.org/cpython/file/2.7/Lib/mutex.py

from typing import Any, Callable, Deque, TypeVar

_ArgType = TypeVar("_ArgType")

class mutex:
    locked: bool
    queue: Deque[Any]
    def __init__(self) -> None: ...
    def test(self) -> bool: ...
    def testandset(self) -> bool: ...
    def lock(self, function: Callable[[_ArgType], Any], argument: _ArgType) -> None: ...
    def unlock(self) -> None: ...
