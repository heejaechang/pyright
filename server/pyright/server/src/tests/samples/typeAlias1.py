# This sample tests that type aliasing works.

from typing import Tuple

TupleAlias = Tuple[int, int]

foo: Tuple[int, int]
bar: TupleAlias

foo = (1, 2)
bar = (1, 2)



