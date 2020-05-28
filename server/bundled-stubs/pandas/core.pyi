from __future__ import annotations  # So we don't have to quote forward refs
import datetime
import sys

from typing import (
    Any,
    AnyStr,
    Callable,
    Dict,
    Generator,
    Generic,
    IO,
    Iterable,
    Iterator,
    List,
    NewType,
    Optional,
    Protocol,
    Sequence,
    Set,
    Tuple,
    Type,
    TypeVar,
    Union,
    overload,
)
if sys.version_info >= (3, 8):
    from typing import Literal
else:
    from typing_extensions import Literal

import numpy as _np
from pathlib import Path
import matplotlib


_str = str  # needed because Series/DataFrame have properties called "str"...
_bool = bool  # ditto

_AxisType = Literal["columns", "index", 0, 1]
_DType = TypeVar("_DType", bool, int, float, object)
_DTypeNp = TypeVar("_DTypeNp", bound=_np.dtype)
#_ListLike = TypeVar("ListLike", List, Tuple, Set, _np.ndarray, Series)
_StrLike = Union[str, _np.str_]
_Path_or_Buf = Union[str, Path, IO]
_LevelType = Union[int, str]
_Scalar = Any  # What should this be?
_np_ndarray_int64 = NewType('np.ndarray[np.int64]', _np.ndarray) # refine this in 3.9
_np_ndarray_bool = NewType('np.ndarray[bool]', _np.ndarray) # refine this in 3.9
_np_ndarray_str = NewType('np.ndarray[str]', _np.ndarray) # refine this in 3.9


class StringMethods:
    def contains(
        self, pat: str, case: bool = ..., flags: int = ..., na: float = ..., regex: bool = ...
    ) -> Series[bool]: ...


_T = TypeVar("_T", _str, int)
_U = TypeVar("_U", _str, int)


class Int8Dtype(object):
    ...


class Int16Dtype(object):
    ...


class Int32Dtype(object):
    ...


class Int64Dtype(object):
    ...


class UInt8Dtype(object):
    ...


class UInt16Dtype(object):
    ...


class UInt32Dtype(object):
    ...


class UInt64Dtype(object):
    ...


class BooleanDtype(object):
    ...


class StringDtype(object):
    ...


class SparseDtype(object):
    
    def __init__(self, dtype: Any  = ..., fill_value: Optional[_Scalar] = ...): ...


class CategoricalDtype(object):

    def __init__(self, categories: Optional[Sequence] = ..., ordered: bool = ...): ...

    @property
    def categories(self) -> Index: ...
    @property
    def ordered(self) -> bool: ...


class Timestamp(datetime.datetime):

    def __init__(self, ts_input: Any, freq: Any, tz: Any, unit: str, year: int, month: int, day: int, hour: int = ..., minute: int = ..., second: int = ..., microsecond: int = ..., nanosecond: int = ..., tzinfo: Any = ...): ...
    
    # Still need to do parameter types
    @property
    def asm8(self) -> int: ...
    @property
    def dayofweek(self) -> int: ...
    @property
    def dayofyear(self) -> int: ...
    @property
    def daysinmonth(self) -> int: ...
    @property
    def days_in_month(self) -> int: ...
    @property
    def freqstr(self) -> int: ...
    @property
    def is_leap_year(self) -> bool: ...
    @property
    def is_month_end(self) -> bool: ...
    @property
    def is_month_start(self) -> bool: ...
    @property
    def is_quarter_end(self) -> bool: ...
    @property
    def is_quarter_start(self) -> bool: ...
    @property
    def is_year_end(self) -> bool: ...
    @property
    def is_year_start(self) -> int: ...
    @property
    def quarter(self) -> int: ...
    @property
    def tz(self) -> Any: ...
    @property
    def week(self) -> int: ...
    @property
    def weekofyear(self) -> int: ...

    # Class methods
    @staticmethod
    def combine(date, time) -> Timestamp: ...
    @staticmethod
    def fromordinal(ordinal: int, freq: Any = ..., tz: Any = ...) -> Timestamp: ...
    @staticmethod
    def fromtimestamp(ts) -> Timestamp: ...
    @staticmethod
    def now(tz: Any) -> Timestamp: ...  
    @staticmethod
    def today(tz: Any) -> Timestamp: ...
    @staticmethod
    def utcfromtimestamp(ts) -> Timestamp: ...
    @staticmethod
    def utcnow() -> Timestamp: ...

    # Methods
    def astimezone(self, tz: Any) -> Timestamp: ...
    def ceil(self, freq: str, ambiguous: str = ..., nonexistent: str = ...) -> Timestamp: ...
    def ctime(self) -> str: ...
    def date(self) -> Any: ...
    def day_name(self, local: Optional[str] = ...) -> str: ...
    def dst(self) -> Timestamp: ...
    def floor(self, freq: str, ambiguous: Any = ..., nonexistent: Any = ...) -> Timestamp: ...
    def fromisoformat(self) -> Any: ...
    def isocalendar(self) -> Tuple[int, int, int]: ...
    def isoweekday(self) -> int: ...
    def monthname(self, local: Any) -> str: ...
    def normalize(self) -> None: ...
    def replace(self, year: Optional[int] = ..., month: Optional[int] = ..., day: Optional[int] = ..., hour: Optional[int] = ..., minute: Optional[int] = ..., second: Optional[int] = ..., microsecond: Optional[int] = ..., nanosecond: Optional[int] = ..., tzinfo: Any = ..., fold: int = ...) -> Timestamp: ...
    def round(self, freq: str, ambiguous: Any = ..., nonexistent: Any = ...) -> Timestamp: ...
    def strftime(self) -> str: ...
    def time(self) -> Timestamp: ...
    def timestamp(self) -> float: ...
    def timetuple(self) -> Tuple: ...
    def timetz(self) -> Timestamp: ...
    def to_datetime64(self) -> _np.datetime64: ...
    def to_julian_date(self) -> Any: ...
    def to_numpy(self) -> _np.datetime64: ...
    def to_period(self, freq: Optional[str] = ...) -> Any: ...
    def to_pydatetime(self) -> datetime.datetime: ...
    def toordinal(self) -> Any: ...
    def tz_convert(self, tz: Any) -> Timestamp: ...
    def tz_localize(self, tz: Any, ambiguous: Any = ..., nonexistent: Any = ...) -> Timestamp: ...
    def tzname(self) -> str: ...
    def utcoffset(self) -> Any: ...
    def utctimetuple(self) -> Any: ...
    def weekday(self) -> int: ...


class Timedelta():

    def __init__(self, value: Any, unit: str = ..., **kwargs): ...

    @property
    def asm8(self) -> int: ...
    @property
    def components(self) -> int: ...
    @property
    def days(self) -> int: ...
    @property
    def delta(self) -> int: ...
    @property
    def microseconds(self) -> int: ...
    @property
    def nanoseconds(self) -> int: ...
    @property
    def resolution_string(self) -> str: ...
    @property
    def seconds(self) -> int: ...

    max: Timedelta
    min: Timedelta
    resolution: Timedelta

    def ceil(self, freq,  **kwargs) -> Timedelta: ...
    def floor(self, freq,  **kwargs) -> Timedelta: ...
    def isoformat(self) -> str: ...
    def round(self, freq) -> Timedelta: ...
    def to_numpy(self) -> _np.timedelta64: ...
    def to_pytimedelta(self) -> datetime.timedelta: ...
    def to_timedelta64(self) -> _np.timedelta64: ...
    def total_seconds(self) -> int: ...


class Period():

    def __init__(self, value: Any = ..., freqstr: Any = ..., ordinal: Any = ..., year: Any = ..., month: int = ..., quarter: Any = ..., day: int = ..., hour: int = ..., minute: int = ..., second: int = ...): ...

    @property
    def day(self) -> int: ...
    @property
    def dayofweek(self) -> int: ...
    @property
    def dayofyear(self) -> int: ...
    @property
    def days_in_month(self) -> int: ...
    @property
    def end_time(self) -> Timestamp: ...
    @property
    def freq(self) -> Any: ...
    @property
    def freqstr(self) -> str: ...
    @property
    def hour(self) -> int: ...
    @property
    def is_leap_year(self) -> bool: ...
    @property
    def minute(self) -> int: ...
    @property
    def month(self) -> int: ...
    @property
    def ordinal(self) -> int: ...
    @property
    def quarter(self) -> int: ...
    @property
    def qyear(self) -> int: ...
    @property
    def second(self) -> int: ...
    @property
    def start_time(self) -> Timestamp: ...
    @property
    def week(self) -> int: ...
    @property
    def weekday(self) -> int: ...
    @property
    def weekofyear(self) -> int: ...
    @property
    def year(self) -> int: ...

    # Static methods
    @staticmethod
    def now() -> Period: ...

    # Methods
    def asfreq(freq: str, how: str = ...) -> Period: ...
    def strftime(fmt: str) -> str: ...
    def to_timestamp(freq: str, how: str = ...) -> Timestamp: ...


class Interval():

    def __init__(self, left: _Scalar, right: _Scalar, closed: str = ...): ...

    @property
    def closed(self) -> bool: ...
    @property
    def closed_left(self) -> bool: ...
    @property
    def closed_right(self) -> bool: ...
    @property
    def is_empty(self) -> bool: ...
    @property
    def left(self) -> _Scalar: ...
    @property
    def length(self) -> _Scalar: ...
    @property
    def mid(self) -> _Scalar: ...
    @property
    def open_left(self) -> bool: ...
    @property
    def open_right(self) -> bool: ...
    @property
    def right(self) -> _Scalar: ...

    # Methods
    def overlaps(self, other: Interval) -> bool: ...


class Categorical():

    def __init__(self, values: List, categories: Any = ..., ordered: bool = ..., dtype: Optional[CategoricalDtype] = ..., fastpath: bool = ...): ...

    @property
    def categories(self) -> Any: ...
    @property
    def codes(self) -> List[int]:  ...
    @property
    def ordered(self) -> bool: ...
    @property
    def dtype(self) -> CategoricalDtype: ...

    # Static Methods
    @staticmethod
    def from_codes(codes: List[int], categories: Optional[Index] = ..., ordered: bool = ..., dtype: Optional[CategoricalDtype] = ...) -> Categorical: ...


class Index(Generic[_T]):

    # magic methods
    def __init__(self, data: Iterable[_T], dtype: Any = ..., copy: bool = ..., name: Any = ..., tupleize_cols: bool = ...): ...
    def __eq__(self, other: object) -> Series: ...  # type: ignore
    @overload
    def __getitem__(self, idx: Union[int, Series[bool], slice, _np_ndarray_int64]) -> _T: ...
    @overload
    def __getitem__(self, idx: Index[_T]) -> Index[_T]: ...
    @overload
    def __getitem__(self, idx: Tuple[_np.ndarray_int64, ...]) -> _T: ...
    def __iter__(self) -> Iterator: ...
    def __len__(self) -> int: ...
    def __ne__(self, other: str) -> Index[_T]: ...  # type: ignore
    #
    # properties
    @property
    def has_duplicates(self) -> bool: ...
    @property
    def has_nans(self) -> bool: ...
    @property
    def is_all_dates(self) -> bool: ...
    @property
    def is_monotonic(self) -> bool: ...
    @property
    def is_monotonic_decreasing(self) -> bool: ...
    @property
    def is_monotonic_increasing(self) -> bool:
        '''Return if the index is monotonic increasing (only equal or
increasing) values.

Examples
--------
>>> Index([1, 2, 3]).is_monotonic_increasing
True
>>> Index([1, 2, 2]).is_monotonic_increasing
True
>>> Index([1, 3, 2]).is_monotonic_increasing
False
'''
        pass
    @property
    def is_unique(self) -> bool: ...
    @property
    def names(self) -> List[_str]: ...
    @property
    def nbytes(self) -> int: ...
    @property
    def ndim(self) -> int: ...
    @property
    def shape(self) -> Tuple[int, ...]: ...
    @property
    def size(self) -> int: ...
    @property
    def str(self) -> StringMethods: ...
    @overload
    def values(self: Index[_str]) -> _np.ndarray_str: ...
    @overload
    def values(self: Index[int]) -> _np.ndarray_int64: ...
    #
    # methods
    @overload
    def astype(self, dtype: Type[_U]) -> Index[_U]:
        '''Create an Index with values cast to dtypes. The class of a new Index
is determined by dtype. When conversion is impossible, a ValueError
exception is raised.

Parameters
----------
dtype : numpy dtype or pandas type
    Note that any signed integer `dtype` is treated as ``'int64'``,
    and any unsigned integer `dtype` is treated as ``'uint64'``,
    regardless of the size.
copy : bool, default True
    By default, astype always returns a newly allocated object.
    If copy is set to False and internal requirements on dtype are
    satisfied, the original data is used to create a new Index
    or the original Index is returned.

Returns
-------
Index
    Index with values cast to specified dtype.
'''
        pass
    @overload
    def astype(self, dtype: _str) -> Index: ...
    def difference(self, other: Union[List[_T], Index[_T]]) -> Index[_T]: ...
    def get_level_values(self, level: _str) -> Index: ...
    def map(self, fn: Callable) -> Index: ...
    def to_frame(self, index: bool = ..., name: Any = ...) -> DataFrame: ...
    def tolist(self) -> List[_T]: ...
    @overload
    def to_numpy(self: Index[_str]) -> _np.ndarray_str: ...
    @overload
    def to_numpy(self: Index[int]) -> _np.ndarray_int64: ...


class Int64Index(Index[_np.int64]):
    ...


class UInt64Index(Index[_np.uint64]):
    ...


class Float64Index(Index[_np.float64]):
    ...


class RangeIndex(Int64Index):
    ...


class CategoricalIndex(Index[CategoricalDtype]):
    ...


class IntervalIndex(Index[Any]):
    ...


class MultiIndex(Index[Any]):
    ...


class DatetimeIndex(Index[Any]):
    ...


class TimedeltaIndex(Index[Any]):
    ...


class PeriodIndex(Index[Any]):
     ...


class Series(Generic[_DType]):

    _DFAxisType = _AxisType
    _AxisType = Literal["index", 0]  # Restricted subset for series
    _ListLike = Union[_np.ndarray, List[_DType], Dict[_str, _np.ndarray], Sequence, Index]

    def __init__(self, data: Optional[Union[_ListLike[_DType], Series[_DType], Dict[int, _DType], Dict[_str, _DType]]] = ..., index: Union[_str, int, Series, List] = ..., dtype: Any = ..., name: _str = ..., copy: bool = ...): ...

    # dunder methods

    def __abs__(self) -> Series[_DType]: ...
    def __add__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __and__(self, other: Union[_ListLike, Series[_DType]]) -> Series[_bool]: ...
    #def __array__(self, dtype: Optional[_bool] = ...) -> _np.ndarray
    def __delitem__(self, idx: Union[int, _str]): ...
    def __div__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __eq__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    def __floordiv__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[int]: ...
    def __ge__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    @overload
    def __getitem__(self, idx: Union[List[_str], Index[int], Series[_DType], slice]) -> Series: ...
    @overload
    def __getitem__(self, idx: Union[int, _str]) -> _DType: ...
    def __gt__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    #def __iadd__(self, other: _DType) -> Series[_DType]: ...
    #def __iand__(self, other: _DType) -> Series[_bool]: ...
    #def __idiv__(self, other: _DType) -> Series[_DType]: ...
    #def __ifloordiv__(self, other: _DType) -> Series[_DType]: ...
    #def __imod__(self, other: _DType) -> Series[_DType]: ...
    #def __imul__(self, other: _DType) -> Series[_DType]: ...
    #def __ior__(self, other: _DType) -> Series[_bool]: ...
    #def __ipow__(self, other: _DType) -> Series[_DType]: ...
    #def __isub__(self, other: _DType) -> Series[_DType]: ...
    #def __itruediv__(self, other: _DType) -> Series[_DType]: ...
    def __iter__(self) -> Iterator: ...
    #def __itruediv__(self, other: Any) -> None: ...
    #def __ixor__(self, other: _DType) -> Series[_bool]: ...
    def __le__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    def __len__(self) -> int: ...
    def __lt__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    def __mul__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __mod__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __ne__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    def __neg__(self) -> None: ...
    def __pow__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __or__(self, other: Union[_ListLike, Series[_DType]]) -> Series[_bool]: ...
    def __radd__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rand__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    def __rdiv__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rdivmod__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rfloordiv__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rmod__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rmul__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rnatmul__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rpow__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __ror__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    def __rsub__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rtruediv__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __rxor__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_bool]: ...
    def __setitem__(self, key: Any, value: Any) -> None: ...
    def __sub__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __truediv__(self, other: Union[num, _ListLike, Series[_DType]]) -> Series[_DType]: ...
    def __xor__(self, other: Union[_ListLike, Series[_DType]]) -> Series: ...

    # properties
    #@property
    #def array(self) -> _np.ndarray
    @property
    def at(self) -> _LocIndexerSeries[_DType]: ...
    @property
    def axes(self) -> List: ...
    #@property
    #def cat(self) -> ?
    @property
    def dt(self) -> Series: ...
    @property
    def dtype(self) -> _DType: ...
    @property
    def dtypes(self) -> _DType: ...
    @property
    def hasnans(self) -> bool: ...
    @property
    def iat(self) -> _iLocIndexerSeries[_DType]: ...
    @property
    def iloc(self) -> _iLocIndexerSeries[_DType]: ...
    @property
    def index(self) -> Index: ...
    @property
    def is_monotonic(self) -> bool: ...
    @property
    def is_monotonic_decreasing(self) -> bool: ...
    @property
    def is_monotonic_increasing(self) -> bool: ...
    @property
    def is_unique(self) -> bool: ...
    @property
    def loc(self) -> _LocIndexerSeries[_DType]: ...
    @property
    def nbytes(self) -> int: ...
    @property
    def ndim(self) -> int: ...
    @property
    def shape(self) -> Tuple: ...
    @property
    def size(self) -> int: ...
    @property
    def values(self) -> _np.ndarray: ...
    @property
    def T(self) -> Series[_DType]: ...

    # Methods
    def abs(self) -> Series[_DType]: ...
    def add(self, other: Union[Series[_DType], _Scalar], level: Optional[_LevelType] = ..., fill_value: Optional[_float] = ..., axis: Literal[0] = ...) -> Series[_DType]: ...
    def add_prefix(self, prefix: _str) -> Series[_DType]: ...
    def add_suffix(self, suffix: _str) -> Series[_DType]: ...
    def aggregate(self, func: Union[Callable, _str, List[Union[Callable, _str]], Dict[_AxisType, Union[Callable, _str]]], axis: _AxisType = ..., *args, **kwargs) -> None:
        '''Aggregate using one or more operations over the specified axis.

.. versionadded:: 0.20.0

Parameters
----------
func : function, str, list or dict
    Function to use for aggregating the data. If a function, must either
    work when passed a Series or when passed to Series.apply.

    Accepted combinations are:

    - function
    - string function name
    - list of functions and/or function names, e.g. ``[np.sum, 'mean']``
    - dict of axis labels -> functions, function names or list of such.
axis : {0 or 'index'}
        Parameter needed for compatibility with DataFrame.
*args
    Positional arguments to pass to `func`.
**kwargs
    Keyword arguments to pass to `func`.

Returns
-------
scalar, Series or DataFrame

    The return can be:

    * scalar : when Series.agg is called with single function
    * Series : when DataFrame.agg is called with a single function
    * DataFrame : when DataFrame.agg is called with several functions

    Return scalar, Series or DataFrame.

See Also
--------
Series.apply : Invoke function on a Series.
Series.transform : Transform function producing a Series with like indexes.

Notes
-----
`agg` is an alias for `aggregate`. Use the alias.

A passed user-defined-function will be passed a Series for evaluation.

Examples
--------
>>> s = pd.Series([1, 2, 3, 4])
>>> s
0    1
1    2
2    3
3    4
dtype: int64

>>> s.agg('min')
1

>>> s.agg(['min', 'max'])
min   1
max   4
dtype: int64
'''
        pass
    def agg(self, func: Union[Callable, _str, List[Union[Callable, _str]], Dict[_AxisType, Union[Callable, _str]]], axis: _AxisType = ..., *args, **kwargs) -> None: ...
    def align(self, other: Union[DataFrame, Series[Any]], join: Literal[('inner', 'outer', 'left', 'right')] = ..., axis: Optional[_DFAxisType] = ..., level: Optional[_LevelType] = ..., copy: _bool = ..., fill_value: Optional[Any] = ..., method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill']] = ..., limit: Optional[int] = ..., fill_axis: _AxisType = ..., broadcast_axis: Optional[_AxisType] = ...) -> Tuple[Series, Series]:
        '''Align two objects on their axes with the specified join method.

Join method is specified for each axis Index.

Parameters
----------
other : DataFrame or Series
join : {'outer', 'inner', 'left', 'right'}, default 'outer'
axis : allowed axis of the other object, default None
    Align on index (0), columns (1), or both (None).
level : int or level name, default None
    Broadcast across a level, matching Index values on the
    passed MultiIndex level.
copy : bool, default True
    Always returns new objects. If copy=False and no reindexing is
    required then original objects are returned.
fill_value : scalar, default np.NaN
    Value to use for missing values. Defaults to NaN, but can be any
    "compatible" value.
method : {'backfill', 'bfill', 'pad', 'ffill', None}, default None
    Method to use for filling holes in reindexed Series:

    - pad / ffill: propagate last valid observation forward to next valid.
    - backfill / bfill: use NEXT valid observation to fill gap.

limit : int, default None
    If method is specified, this is the maximum number of consecutive
    NaN values to forward/backward fill. In other words, if there is
    a gap with more than this number of consecutive NaNs, it will only
    be partially filled. If method is not specified, this is the
    maximum number of entries along the entire axis where NaNs will be
    filled. Must be greater than 0 if not None.
fill_axis : {0 or 'index'}, default 0
    Filling axis, method and limit.
broadcast_axis : {0 or 'index'}, default None
    Broadcast values along this axis, if aligning two objects of
    different dimensions.

Returns
-------
(left, right) : (Series, type of other)
    Aligned objects.
'''
        pass
    def all(self, axis: _AxisType = ..., bool_only: Optional[_bool] = ..., skipna : _bool = ..., level: Optional[_LevelType] = ..., **kwargs) -> _bool: ...
    def any(self, axis: _AxisType = ..., bool_only: Optional[_bool] = ..., skipna : _bool = ..., level: Optional[_LevelType] = ..., **kwargs) -> _bool: ...
    def append(self, to_append: Union[Series[Any], Sequence[Series[Any]]], ignore_index: _bool = ..., verify_integrity: _bool = ...) -> Series[_DType]: ...
    def apply(self, func: Callable, convert_dtype: _bool = ..., args: Tuple = ..., **kwargs) -> Union[Series[Any], DataFrame]: ...
    def argmax(self, axis: Optional[_AxisType] = ..., skipna : _bool = ..., **kwargs) -> _np.ndarray: ...
    def argmin(self, axis: Optional[_AxisType] = ..., skipna : _bool = ..., **kwargs) -> _np.ndarray: ...
    def argsort(self, axis: _AxisType = ..., kind: Literal['mergesort', 'quicksort', 'heapsort'] = ..., order: None = ...) -> Series[int]: ...
    def asfreq(self, freq: Any, method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill']] = ..., how: Optional[Literal['start', 'end']] = ..., normalize: _bool = ..., fill_value: Optional[_Scalar] = ...) -> Series[_DType]: ...
    @overload
    def asof(self, where: _Scalar, subset: Optional[Union[_str, Sequence[_str]]] = ...) -> Scalar: ...
    @overload
    def asof(self, where: Sequence[_Scalar], subset: Optional[Union[_str, Sequence[_str]]] = ...) -> Series[_DType]: ...
    @overload
    def astype(self, dtype: _str, copy: _bool = ..., errors: Literal['raise', 'ignore'] = ...) -> Series[_str]: ...
    @overload
    def astype(self, dtype: Type[float], copy: _bool = ..., errors: Literal['raise', 'ignore'] = ...) -> Series[float]: ...
    @overload
    def astype(self, dtype: Type[int], copy: _bool = ..., errors: Literal['raise', 'ignore'] = ...) -> Series[int]: ...
    def at_time(self, time: Union[_str, datetime.time], asof: _bool = ..., axis: Optional[_AxisType] = ...) -> Series[_DType]: ...
    def autocorr(self, lag: int = ...) -> float: ... 
    def between(self, left: Union[_Scalar, Sequence], right: Union[_Scalar, Sequence], inclusive: _bool = ...) -> Series[_bool]: ...
    def between_time(self, start_time: Union[_str, datetime.time], end_time: Union[_str, datetime.time], include_start: _bool = ..., include_end: _bool = ..., axis: Optional[_AxisType] = ...) -> Series[_DType]: ...
    @overload
    def bfill(self, value: Union[_DType, Dict, Series[_DType], DataFrame], axis: _AxisType = ..., limit: Optional[int] = ..., downcast: Optional[Dict] = ..., *, inplace: Literal[True]) -> Series[_DType]: ...
    @overload
    def bfill(self, value: Union[_DType, Dict, Series[_DType], DataFrame], axis: _AxisType = ..., inplace: Literal[False] = ..., limit: Optional[int] = ..., downcast: Optional[Dict] = ...) -> None: ...
    def bool(self) -> _bool: ...
    def clip(self, lower: Optional[float] = ..., upper: Optional[float] = ..., axis: Optional[_AxisType] = ..., inplace: _bool = ..., **kwargs) -> Series[_DType]: ...
    def combine(self, other: Series[_DType], func: Callable, fill_value: Optional[_Scalar] = ...) -> Series[_DType]: ...
    def combine_first(self, other: Series[_DType]) -> Series[_DType]: ...
    def convert_dtypes(self, infer_objects: _bool = ..., convert_string: _bool = ..., convert_integer: _bool = ..., convert_boolean: _bool = ...) -> Series[_DType]: ...
    def copy(self, deep: _bool = ...) -> Series[_DType]: ...
    def corr(self, other: Series[_DType], method: Literal['pearson', 'kendall', 'spearman'] = ..., min_periods: int = ...) -> float: ...
    @overload
    def count(self, level: None = ...) -> int: ...
    @overload
    def count(self, level: _LevelType) -> Series[_DType]: ...
    def cov(self, other: Series[_DType], min_periods: Optional[int] = ...) -> float: ...
    def cummax(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., **kwargs) -> Series[_DType]: ...
    def cummin(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., **kwargs) -> Series[_DType]: ...
    def cumprod(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., **kwargs) -> Series[_DType]: ...
    def cumsum(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., **kwargs) -> Series[_DType]: ...
    def describe(self, percentiles: Optional[List[float]] = ..., include: Optional[Union[Literal['all'], List[_dtype]]] = ..., exclude: Optional[List[_dtype]] = ...) -> Series[_DType]: ...
    def diff(self, periods: int = ...) -> Series[_DType]: ...
    def div(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[float]: ...
    def divide(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[float]: ...
    def divmod(self, other:  Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    @overload
    def dot(self, other: Union[DataFrame, Series[_DType]]) -> Series[_DType]: ...
    @overload
    def dot(self, other: _ListLike) -> _np.ndarray: ...
    def drop(self, labels: Optional[Union[_str, List]] = ..., axis: _AxisType = ..., index: Optional[Union[List[_str], List[int], Index]] = ..., columns: Optional[Union[_str, List]] = ..., level: Optional[_LevelType] = ..., inplace: _bool = ..., errors: Literal[('ignore', 'raise')] = ...) -> Series: ...
    def drop_duplicates(self, keep: Literal['first', 'last', False] = ..., inplace: _bool = ...) -> Series[_DType]: ...
    def droplevel(self, level: _LevelType, axis: _AxisType = ...) -> DataFrame: ...
    def dropna(self, axis: _AxisType = ..., inplace: _bool = ..., how: Optional[_str] = ...) -> Series[_DType]: ...
    def duplicated(self, keep: Literal['first', 'last', False] = ...) -> Series[_bool]: ...
    def eq(self, other: Union[_Scalar, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_bool]: ...
    def equals(self, other: Series[_DType]) -> _bool: ...
    def ewm(self, com: Optional[float] = ..., span: Optional[float] = ..., halflife: Optional[float] = ..., alpha: Optional[float] = ..., min_periods: int = ..., adjust: _bool = ..., ignore_na: _bool = ..., axis: _AxisType = ...) -> DataFrame: ...
    def expanding(self, min_periods: int = ..., center: _bool = ..., axis: _AxisType = ...) -> DataFrame: ...
    def explode(self) -> Series[_DType]: ...
    def factorize(self, sort: _bool = ..., na_sentinel: int = ...) -> Tuple[_np.ndarray, Union[_np.ndarray, Index, object]]: ...
    @overload
    def ffill(self, value: Union[_DType, Dict, Series[_DType], DataFrame], axis: _AxisType, inplace: Literal[True], limit: Optional[int] = ..., downcast: Optional[Dict] = ...) -> Series[_DType]: ...
    @overload
    def ffill(self, value: Union[_DType, Dict, Series[_DType], DataFrame], inplace: Literal[True], limit: Optional[int] = ..., downcast: Optional[Dict] = ...) -> Series[_DType]: ...
    @overload
    def ffill(self, value: Union[_DType, Dict, Series[_DType], DataFrame], axis: _AxisType = ..., inplace: Literal[False] = ..., limit: Optional[int] = ..., downcast: Optional[Dict] = ...) -> None: ...
    @overload
    def fillna(self, value: Union[_DType, Dict, Series[_DType], DataFrame], method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill']] = ..., axis: _AxisType = ..., limit: Optional[int] = ..., downcast: Optional[Dict] = ..., *, inplace: Literal[True]) -> Series[_DType]:
        '''Fill NA/NaN values using the specified method.

Parameters
----------
value : scalar, dict, Series, or DataFrame
    Value to use to fill holes (e.g. 0), alternately a
    dict/Series/DataFrame of values specifying which value to use for
    each index (for a Series) or column (for a DataFrame).  Values not
    in the dict/Series/DataFrame will not be filled. This value cannot
    be a list.
method : {'backfill', 'bfill', 'pad', 'ffill', None}, default None
    Method to use for filling holes in reindexed Series
    pad / ffill: propagate last valid observation forward to next valid
    backfill / bfill: use next valid observation to fill gap.
axis : {0 or 'index'}
    Axis along which to fill missing values.
inplace : bool, default False
    If True, fill in-place. Note: this will modify any
    other views on this object (e.g., a no-copy slice for a column in a
    DataFrame).
limit : int, default None
    If method is specified, this is the maximum number of consecutive
    NaN values to forward/backward fill. In other words, if there is
    a gap with more than this number of consecutive NaNs, it will only
    be partially filled. If method is not specified, this is the
    maximum number of entries along the entire axis where NaNs will be
    filled. Must be greater than 0 if not None.
downcast : dict, default is None
    A dict of item->dtype of what to downcast if possible,
    or the string 'infer' which will try to downcast to an appropriate
    equal type (e.g. float64 to int64 if possible).

Returns
-------
Series or None
    Object with missing values filled or None if ``inplace=True``.

See Also
--------
interpolate : Fill NaN values using interpolation.
reindex : Conform object to new index.
asfreq : Convert TimeSeries to specified frequency.

Examples
--------
>>> df = pd.DataFrame([[np.nan, 2, np.nan, 0],
...                    [3, 4, np.nan, 1],
...                    [np.nan, np.nan, np.nan, 5],
...                    [np.nan, 3, np.nan, 4]],
...                   columns=list('ABCD'))
>>> df
     A    B   C  D
0  NaN  2.0 NaN  0
1  3.0  4.0 NaN  1
2  NaN  NaN NaN  5
3  NaN  3.0 NaN  4

Replace all NaN elements with 0s.

>>> df.fillna(0)
    A   B   C   D
0   0.0 2.0 0.0 0
1   3.0 4.0 0.0 1
2   0.0 0.0 0.0 5
3   0.0 3.0 0.0 4

We can also propagate non-null values forward or backward.

>>> df.fillna(method='ffill')
    A   B   C   D
0   NaN 2.0 NaN 0
1   3.0 4.0 NaN 1
2   3.0 4.0 NaN 5
3   3.0 3.0 NaN 4

Replace all NaN elements in column 'A', 'B', 'C', and 'D', with 0, 1,
2, and 3 respectively.

>>> values = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
>>> df.fillna(value=values)
    A   B   C   D
0   0.0 2.0 2.0 0
1   3.0 4.0 2.0 1
2   0.0 1.0 2.0 5
3   0.0 3.0 2.0 4

Only replace the first NaN element.

>>> df.fillna(value=values, limit=1)
    A   B   C   D
0   0.0 2.0 2.0 0
1   3.0 4.0 NaN 1
2   NaN 1.0 NaN 5
3   NaN 3.0 NaN 4
'''
        pass
    @overload
    def fillna(self, value: Union[_DType, Dict, Series[_DType], DataFrame],method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill']] = ..., axis: _AxisType = ...,  inplace: Literal[False] = ..., limit: Optional[int] = ..., downcast: Optional[Dict] = ...) -> None: ...
    def filter(self, items: Optional[_ListLike] = ..., like: Optional[_str] = ..., regex: Optional[_str] = ..., axis: Optional[_AxisType] = ...) -> Series[_Dtype]: ...
    def first(self, offset: Any) -> Series[_DType]: ...
    def first_valid_index(self) -> _Scalar: ...
    def floordiv(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: Optional[_AxisType] = ...) -> Series[int]: ...
    def ge(self, other: Union[_Scalar, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_bool]: ...
    def get(self, key: object, default: Optional[_DType] = ...) -> _DType: ...
    def groupby(self, by: Optional[Any] = ..., axis: _AxisType = ..., level: Optional[_LevelType] = ..., as_index: _bool = ..., sort: _bool = ..., group_keys: _bool = ..., squeeze: _bool = ..., observed: _bool = ...) -> SeriesGroupBy:
        '''Group Series using a mapper or by a Series of columns.

A groupby operation involves some combination of splitting the
object, applying a function, and combining the results. This can be
used to group large amounts of data and compute operations on these
groups.

Parameters
----------
by : mapping, function, label, or list of labels
    Used to determine the groups for the groupby.
    If ``by`` is a function, it's called on each value of the object's
    index. If a dict or Series is passed, the Series or dict VALUES
    will be used to determine the groups (the Series' values are first
    aligned; see ``.align()`` method). If an ndarray is passed, the
    values are used as-is determine the groups. A label or list of
    labels may be passed to group by the columns in ``self``. Notice
    that a tuple is interpreted as a (single) key.
axis : {0 or 'index', 1 or 'columns'}, default 0
    Split along rows (0) or columns (1).
level : int, level name, or sequence of such, default None
    If the axis is a MultiIndex (hierarchical), group by a particular
    level or levels.
as_index : bool, default True
    For aggregated output, return object with group labels as the
    index. Only relevant for DataFrame input. as_index=False is
    effectively "SQL-style" grouped output.
sort : bool, default True
    Sort group keys. Get better performance by turning this off.
    Note this does not influence the order of observations within each
    group. Groupby preserves the order of rows within each group.
group_keys : bool, default True
    When calling apply, add group keys to index to identify pieces.
squeeze : bool, default False
    Reduce the dimensionality of the return type if possible,
    otherwise return a consistent type.
observed : bool, default False
    This only applies if any of the groupers are Categoricals.
    If True: only show observed values for categorical groupers.
    If False: show all values for categorical groupers.

    .. versionadded:: 0.23.0

Returns
-------
SeriesGroupBy
    Returns a groupby object that contains information about the groups.

See Also
--------
resample : Convenience method for frequency conversion and resampling
    of time series.

Notes
-----
See the `user guide
<https://pandas.pydata.org/pandas-docs/stable/groupby.html>`_ for more.

Examples
--------
>>> ser = pd.Series([390., 350., 30., 20.],
...                 index=['Falcon', 'Falcon', 'Parrot', 'Parrot'], name="Max Speed")
>>> ser
Falcon    390.0
Falcon    350.0
Parrot     30.0
Parrot     20.0
Name: Max Speed, dtype: float64
>>> ser.groupby(["a", "b", "a", "b"]).mean()
a    210.0
b    185.0
Name: Max Speed, dtype: float64
>>> ser.groupby(level=0).mean()
Falcon    370.0
Parrot     25.0
Name: Max Speed, dtype: float64
>>> ser.groupby(ser > 100).mean()
Max Speed
False     25.0
True     370.0
Name: Max Speed, dtype: float64

**Grouping by Indexes**

We can groupby different levels of a hierarchical index
using the `level` parameter:

>>> arrays = [['Falcon', 'Falcon', 'Parrot', 'Parrot'],
...           ['Captive', 'Wild', 'Captive', 'Wild']]
>>> index = pd.MultiIndex.from_arrays(arrays, names=('Animal', 'Type'))
>>> ser = pd.Series([390., 350., 30., 20.], index=index, name="Max Speed")
>>> ser
Animal  Type
Falcon  Captive    390.0
        Wild       350.0
Parrot  Captive     30.0
        Wild        20.0
Name: Max Speed, dtype: float64
>>> ser.groupby(level=0).mean()
Animal
Falcon    370.0
Parrot     25.0
Name: Max Speed, dtype: float64
>>> ser.groupby(level="Type").mean()
Type
Captive    210.0
Wild       185.0
Name: Max Speed, dtype: float64
'''
        pass
    def gt(self, other: Union[_Scalar, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_bool]: ...
    def head(self, n: int = ...) -> Series[_DType]: ...
    def hist(self, by: Optional[object] = ..., ax: Optional[matplotlib.axes.Axes] = ..., grid: _bool = ..., xlabelsize: Optional[int] = ..., xrot: Optional[float] = ..., ylabelsize: Optional[int] = ..., yrot: Optional[float] = ..., figsize: Optional[Tuple[float, float]] = ..., bins: Union[int, Sequence] = ..., backend: Optional[_str] = ..., **kwargs) -> matplotlib.axes.SubplotBase: ...
    def idxmax(self, axis: _AxisType = ..., skipna : _bool = ..., **kwargs) -> Union[int, _str]: ...
    def idxmin(self, axis: _AxisType = ..., skipna : _bool = ..., **kwargs) -> Union[int, _str]: ...
    def infer_objects(self) -> Series[_DType]: ...
    def interpolate(self, method: Literal['linear', 'time', 'index', 'values', 'pad', 'nearest', 'slinear', 'quadratic', 'cubic', 'spline', 'barycentric', 'polynomial', 'krogh', 'pecewise_polynomial', 'spline', 'pchip', 'akima', 'from_derivatives'] = ..., axis: Optional[_AxisType] = ..., limit: Optional[int] = ..., inplace: _bool = ..., limit_direction: Optional[Literal['forward', 'backward', 'both']] = ..., limit_area: Optional[Literal['inside', 'outside']] = ..., downcast: Optional[Literal['infer']] = ..., **kwargs) -> Series[_DType]: ...
    def isin(self, values: Union[Iterable, Series[_DType], Dict]) -> Series[_bool]: ...
    def isna(self) -> Series[_bool]:
        '''Detect missing values.

Return a boolean same-sized object indicating if the values are NA.
NA values, such as None or :attr:`numpy.NaN`, gets mapped to True
values.
Everything else gets mapped to False values. Characters such as empty
strings ``''`` or :attr:`numpy.inf` are not considered NA values
(unless you set ``pandas.options.mode.use_inf_as_na = True``).

Returns
-------
Series
    Mask of bool values for each element in Series that
    indicates whether an element is not an NA value.

See Also
--------
Series.isnull : Alias of isna.
Series.notna : Boolean inverse of isna.
Series.dropna : Omit axes labels with missing values.
isna : Top-level isna.

Examples
--------
Show which entries in a DataFrame are NA.

>>> df = pd.DataFrame({'age': [5, 6, np.NaN],
...                    'born': [pd.NaT, pd.Timestamp('1939-05-27'),
...                             pd.Timestamp('1940-04-25')],
...                    'name': ['Alfred', 'Batman', ''],
...                    'toy': [None, 'Batmobile', 'Joker']})
>>> df
   age       born    name        toy
0  5.0        NaT  Alfred       None
1  6.0 1939-05-27  Batman  Batmobile
2  NaN 1940-04-25              Joker

>>> df.isna()
     age   born   name    toy
0  False   True  False   True
1  False  False  False  False
2   True  False  False  False

Show which entries in a Series are NA.

>>> ser = pd.Series([5, 6, np.NaN])
>>> ser
0    5.0
1    6.0
2    NaN
dtype: float64

>>> ser.isna()
0    False
1    False
2     True
dtype: bool
'''
        pass
    def isnull(self) -> Series[_bool]:
        '''Detect missing values.

Return a boolean same-sized object indicating if the values are NA.
NA values, such as None or :attr:`numpy.NaN`, gets mapped to True
values.
Everything else gets mapped to False values. Characters such as empty
strings ``''`` or :attr:`numpy.inf` are not considered NA values
(unless you set ``pandas.options.mode.use_inf_as_na = True``).

Returns
-------
Series
    Mask of bool values for each element in Series that
    indicates whether an element is not an NA value.

See Also
--------
Series.isnull : Alias of isna.
Series.notna : Boolean inverse of isna.
Series.dropna : Omit axes labels with missing values.
isna : Top-level isna.

Examples
--------
Show which entries in a DataFrame are NA.

>>> df = pd.DataFrame({'age': [5, 6, np.NaN],
...                    'born': [pd.NaT, pd.Timestamp('1939-05-27'),
...                             pd.Timestamp('1940-04-25')],
...                    'name': ['Alfred', 'Batman', ''],
...                    'toy': [None, 'Batmobile', 'Joker']})
>>> df
   age       born    name        toy
0  5.0        NaT  Alfred       None
1  6.0 1939-05-27  Batman  Batmobile
2  NaN 1940-04-25              Joker

>>> df.isna()
     age   born   name    toy
0  False   True  False   True
1  False  False  False  False
2   True  False  False  False

Show which entries in a Series are NA.

>>> ser = pd.Series([5, 6, np.NaN])
>>> ser
0    5.0
1    6.0
2    NaN
dtype: float64

>>> ser.isna()
0    False
1    False
2     True
dtype: bool
'''
        pass
    def item(self) -> _DType: ...
    def items(self) -> Iterable[Tuple[Union[int, _str], _DType]]: ...
    def iteritems(self) -> Iterable[Tuple[Union[int, _str], _DType]]:
        '''Lazily iterate over (index, value) tuples.

This method returns an iterable tuple (index, value). This is
convenient if you want to create a lazy iterator.

Returns
-------
iterable
    Iterable of tuples containing the (index, value) pairs from a
    Series.

See Also
--------
DataFrame.items : Iterate over (column name, Series) pairs.
DataFrame.iterrows : Iterate over DataFrame rows as (index, Series) pairs.

Examples
--------
>>> s = pd.Series(['A', 'B', 'C'])
>>> for index, value in s.items():
...     print(f"Index : {index}, Value : {value}")
Index : 0, Value : A
Index : 1, Value : B
Index : 2, Value : C
'''
        pass
    def keys(self) -> List: ...
    @overload
    def kurt(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def kurt(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _Scalar: ...
    @overload
    def kurtosis(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., numeric_only: Optional[_bool] = ..., *, level: Optional[_LevelType], **kwargs) -> Series[_DType]: ...
    @overload
    def kurtosis(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _Scalar: ...
    def last(self, offset: Any) -> Series[_DType]: ...
    def last_valid_index(self) -> Scalar: ...
    def le(self, other: Union[_Scalar, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_bool]: ...
    def lt(self, other: Union[_Scalar, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_bool]: ...
    @overload
    def mad(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., *, level: Optional[_LevelType], **kwargs) -> Series[_DType]: ...
    @overload
    def mad(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., level: None = ...,  **kwargs) -> _Scalar: ...
    def map(self, arg: Any, na_action: Optional[Literal['ignore']] = ...) -> Series[_DType]: ...
    def mask(self, cond: Union[Series[_DType], _np.ndarray, Callable], other: Union[_Scalar, Series[_DType], DataFrame, Callable] = ..., inplace: _bool = ..., axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., errors: Literal['raise', 'ignore'] = ..., try_cast: _bool = ...) -> Series[_DType]: ...
    @overload
    def max(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def max(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _DType: ...
    @overload
    def mean(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def mean(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _DType: ...
    @overload
    def median(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def median(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _DType: ...
    def memory_usage(self, index: _bool = ..., deep: _bool = ...) -> int: ...
    @overload
    def min(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def min(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _DType: ...
    def mod(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: Optional[_AxisType] = ...) -> Series[_DType]: ...
    def mode(self, dropna: Any) -> Series[_DType]: ...
    def mul(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: Optional[_AxisType] = ...) -> Series[_DType]: ...
    def multiply(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: Optional[_AxisType] = ...) -> Series[_DType]: ...
    def ne(self, other: Union[_Scalar, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_bool]: ...
    def nlargest(self, n: int = ..., keep: Literal['first', 'last', 'all'] = ...) -> Series[_DType]: ...
    def notna(self) -> Series[_bool]:
        '''Detect existing (non-missing) values.

Return a boolean same-sized object indicating if the values are not NA.
Non-missing values get mapped to True. Characters such as empty
strings ``''`` or :attr:`numpy.inf` are not considered NA values
(unless you set ``pandas.options.mode.use_inf_as_na = True``).
NA values, such as None or :attr:`numpy.NaN`, get mapped to False
values.

Returns
-------
Series
    Mask of bool values for each element in Series that
    indicates whether an element is not an NA value.

See Also
--------
Series.notnull : Alias of notna.
Series.isna : Boolean inverse of notna.
Series.dropna : Omit axes labels with missing values.
notna : Top-level notna.

Examples
--------
Show which entries in a DataFrame are not NA.

>>> df = pd.DataFrame({'age': [5, 6, np.NaN],
...                    'born': [pd.NaT, pd.Timestamp('1939-05-27'),
...                             pd.Timestamp('1940-04-25')],
...                    'name': ['Alfred', 'Batman', ''],
...                    'toy': [None, 'Batmobile', 'Joker']})
>>> df
   age       born    name        toy
0  5.0        NaT  Alfred       None
1  6.0 1939-05-27  Batman  Batmobile
2  NaN 1940-04-25              Joker

>>> df.notna()
     age   born  name    toy
0   True  False  True  False
1   True   True  True   True
2  False   True  True   True

Show which entries in a Series are not NA.

>>> ser = pd.Series([5, 6, np.NaN])
>>> ser
0    5.0
1    6.0
2    NaN
dtype: float64

>>> ser.notna()
0     True
1     True
2    False
dtype: bool
'''
        pass
    def notnull(self) -> Series[_bool]:
        '''Detect existing (non-missing) values.

Return a boolean same-sized object indicating if the values are not NA.
Non-missing values get mapped to True. Characters such as empty
strings ``''`` or :attr:`numpy.inf` are not considered NA values
(unless you set ``pandas.options.mode.use_inf_as_na = True``).
NA values, such as None or :attr:`numpy.NaN`, get mapped to False
values.

Returns
-------
Series
    Mask of bool values for each element in Series that
    indicates whether an element is not an NA value.

See Also
--------
Series.notnull : Alias of notna.
Series.isna : Boolean inverse of notna.
Series.dropna : Omit axes labels with missing values.
notna : Top-level notna.

Examples
--------
Show which entries in a DataFrame are not NA.

>>> df = pd.DataFrame({'age': [5, 6, np.NaN],
...                    'born': [pd.NaT, pd.Timestamp('1939-05-27'),
...                             pd.Timestamp('1940-04-25')],
...                    'name': ['Alfred', 'Batman', ''],
...                    'toy': [None, 'Batmobile', 'Joker']})
>>> df
   age       born    name        toy
0  5.0        NaT  Alfred       None
1  6.0 1939-05-27  Batman  Batmobile
2  NaN 1940-04-25              Joker

>>> df.notna()
     age   born  name    toy
0   True  False  True  False
1   True   True  True   True
2  False   True  True   True

Show which entries in a Series are not NA.

>>> ser = pd.Series([5, 6, np.NaN])
>>> ser
0    5.0
1    6.0
2    NaN
dtype: float64

>>> ser.notna()
0     True
1     True
2    False
dtype: bool
'''
        pass
    def nsmallest(self, n: int = ..., keep: Literal['first', 'last', 'all'] = ...) -> Series[_DType]: ...
    def nunique(self, dropna: _bool = ...) -> int: ...
    def pct_change(self, periods: int = ..., fill_method: _str = ..., limit: Optional[int] = ..., freq: Optional[Any] = ..., **kwargs) -> Series[_DType]: ...
    def pipe(self, func: Callable, **kwargs) -> Any: ...
    def plot(self, **kwargs) -> Union[matplotlib.axes.Axes, _np.ndarray]: ...
    def pop(self, item: _str) -> Series[_DType]: ...
    def pow(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: Optional[_AxisType] = ...) -> Series[_DType]: ...
    @overload
    def prod(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def prod(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., **kwargs) -> _Scalar: ...
    @overload
    def product(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def product(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., **kwargs) -> _Scalar: ...
    @overload
    def quantile(self, q: float = ..., interpolation: Literal['linear', 'lower', 'higher', 'midpoint', 'nearest'] = ...) -> float: ...
    @overload
    def quantile(self, q: _ListLike = ..., interpolation: Literal['linear', 'lower', 'higher', 'midpoint', 'nearest'] = ...) -> Series[_DType]: ...
    def radd(self, other: Union[Series[_DType], _Scalar], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def rank(self, axis: _AxisType = ..., method: Literal['average', 'min', 'max', 'first', 'dense'] = ..., numeric_only: Optional[_bool] = ..., na_option: Literal['keep', 'top', 'bottom'] = ..., ascending: _bool = ..., pct: _bool = ...) -> Series: ...
    def ravel(self, order: _str = ...) -> _np.ndarray: ...
    def rdiv(self, other: Union[Series[_DType], _Scalar], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def rdivmod(self, other: Union[Series[_DType], _Scalar], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def reindex(self, index: Optional[_ListLike] = ..., **kwargs) -> Series[_DType]:
        '''Conform Series to new index with optional filling logic.

Places NA/NaN in locations having no value in the previous index. A new object
is produced unless the new index is equivalent to the current one and
``copy=False``.

Parameters
----------

index : array-like, optional
    New labels / index to conform to, should be specified using
    keywords. Preferably an Index object to avoid duplicating data.

method : {None, 'backfill'/'bfill', 'pad'/'ffill', 'nearest'}
    Method to use for filling holes in reindexed DataFrame.
    Please note: this is only applicable to DataFrames/Series with a
    monotonically increasing/decreasing index.

    * None (default): don't fill gaps
    * pad / ffill: Propagate last valid observation forward to next
      valid.
    * backfill / bfill: Use next valid observation to fill gap.
    * nearest: Use nearest valid observations to fill gap.

copy : bool, default True
    Return a new object, even if the passed indexes are the same.
level : int or name
    Broadcast across a level, matching Index values on the
    passed MultiIndex level.
fill_value : scalar, default np.NaN
    Value to use for missing values. Defaults to NaN, but can be any
    "compatible" value.
limit : int, default None
    Maximum number of consecutive elements to forward or backward fill.
tolerance : optional
    Maximum distance between original and new labels for inexact
    matches. The values of the index at the matching locations most
    satisfy the equation ``abs(index[indexer] - target) <= tolerance``.

    Tolerance may be a scalar value, which applies the same tolerance
    to all values, or list-like, which applies variable tolerance per
    element. List-like includes list, tuple, array, Series, and must be
    the same size as the index and its dtype must exactly match the
    index's type.

    .. versionadded:: 0.21.0 (list-like tolerance)

Returns
-------
Series with changed index.

See Also
--------
DataFrame.set_index : Set row labels.
DataFrame.reset_index : Remove row labels or move them to new columns.
DataFrame.reindex_like : Change to same indices as other DataFrame.

Examples
--------

``DataFrame.reindex`` supports two calling conventions

* ``(index=index_labels, columns=column_labels, ...)``
* ``(labels, axis={'index', 'columns'}, ...)``

We *highly* recommend using keyword arguments to clarify your
intent.

Create a dataframe with some fictional data.

>>> index = ['Firefox', 'Chrome', 'Safari', 'IE10', 'Konqueror']
>>> df = pd.DataFrame({'http_status': [200, 200, 404, 404, 301],
...                   'response_time': [0.04, 0.02, 0.07, 0.08, 1.0]},
...                   index=index)
>>> df
           http_status  response_time
Firefox            200           0.04
Chrome             200           0.02
Safari             404           0.07
IE10               404           0.08
Konqueror          301           1.00

Create a new index and reindex the dataframe. By default
values in the new index that do not have corresponding
records in the dataframe are assigned ``NaN``.

>>> new_index = ['Safari', 'Iceweasel', 'Comodo Dragon', 'IE10',
...              'Chrome']
>>> df.reindex(new_index)
               http_status  response_time
Safari               404.0           0.07
Iceweasel              NaN            NaN
Comodo Dragon          NaN            NaN
IE10                 404.0           0.08
Chrome               200.0           0.02

We can fill in the missing values by passing a value to
the keyword ``fill_value``. Because the index is not monotonically
increasing or decreasing, we cannot use arguments to the keyword
``method`` to fill the ``NaN`` values.

>>> df.reindex(new_index, fill_value=0)
               http_status  response_time
Safari                 404           0.07
Iceweasel                0           0.00
Comodo Dragon            0           0.00
IE10                   404           0.08
Chrome                 200           0.02

>>> df.reindex(new_index, fill_value='missing')
              http_status response_time
Safari                404          0.07
Iceweasel         missing       missing
Comodo Dragon     missing       missing
IE10                  404          0.08
Chrome                200          0.02

We can also reindex the columns.

>>> df.reindex(columns=['http_status', 'user_agent'])
           http_status  user_agent
Firefox            200         NaN
Chrome             200         NaN
Safari             404         NaN
IE10               404         NaN
Konqueror          301         NaN

Or we can use "axis-style" keyword arguments

>>> df.reindex(['http_status', 'user_agent'], axis="columns")
           http_status  user_agent
Firefox            200         NaN
Chrome             200         NaN
Safari             404         NaN
IE10               404         NaN
Konqueror          301         NaN

To further illustrate the filling functionality in
``reindex``, we will create a dataframe with a
monotonically increasing index (for example, a sequence
of dates).

>>> date_index = pd.date_range('1/1/2010', periods=6, freq='D')
>>> df2 = pd.DataFrame({"prices": [100, 101, np.nan, 100, 89, 88]},
...                    index=date_index)
>>> df2
            prices
2010-01-01   100.0
2010-01-02   101.0
2010-01-03     NaN
2010-01-04   100.0
2010-01-05    89.0
2010-01-06    88.0

Suppose we decide to expand the dataframe to cover a wider
date range.

>>> date_index2 = pd.date_range('12/29/2009', periods=10, freq='D')
>>> df2.reindex(date_index2)
            prices
2009-12-29     NaN
2009-12-30     NaN
2009-12-31     NaN
2010-01-01   100.0
2010-01-02   101.0
2010-01-03     NaN
2010-01-04   100.0
2010-01-05    89.0
2010-01-06    88.0
2010-01-07     NaN

The index entries that did not have a value in the original data frame
(for example, '2009-12-29') are by default filled with ``NaN``.
If desired, we can fill in the missing values using one of several
options.

For example, to back-propagate the last valid value to fill the ``NaN``
values, pass ``bfill`` as an argument to the ``method`` keyword.

>>> df2.reindex(date_index2, method='bfill')
            prices
2009-12-29   100.0
2009-12-30   100.0
2009-12-31   100.0
2010-01-01   100.0
2010-01-02   101.0
2010-01-03     NaN
2010-01-04   100.0
2010-01-05    89.0
2010-01-06    88.0
2010-01-07     NaN

Please note that the ``NaN`` value present in the original dataframe
(at index value 2010-01-03) will not be filled by any of the
value propagation schemes. This is because filling while reindexing
does not look at dataframe values, but only compares the original and
desired indexes. If you do want to fill in the ``NaN`` values present
in the original dataframe, use the ``fillna()`` method.

See the :ref:`user guide <basics.reindexing>` for more.
'''
        pass
    def reindex_like(self, other: Series[_DType], method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill', 'nearest']] = ..., copy: _bool = ..., limit: Optional[int] = ..., tolerance: Optional[float] = ...) -> Series: ...
    def rename(self, index: Optional[Any] = ..., axis: Optional[_AxisType] = ..., copy: _bool = ..., inplace: _bool = ..., level: Optional[_LevelType] = ..., errors: Literal['raise', 'ignore'] = ..., **kwargs) -> Series: ...
    @overload
    def rename_axis(self, mapper: Union[_Scalar, _ListLike] = ..., index: Optional[Union[_Scalar, _ListLike, Callable, Dict]] = ..., columns: Optional[Union[_Scalar, _ListLike, Callable, Dict]] = ..., axis: Optiona[_AxisType] = ..., copy: _bool = ..., *, inplace: Literal[True]) -> None: ...
    @overload
    def rename_axis(self, mapper: Union[_Scalar, _ListLike]  = ..., index: Optional[Union[_Scalar, _ListLike, Callable, Dict]] = ..., columns: Optional[Union[_Scalar, _ListLike, Callable, Dict]] = ..., axis: Optiona[_AxisType] = ..., copy: _bool = ..., inplace: Optional[Literal[False]] = ...) -> Series: ...
    def reorder_levels(self, order: List) -> Series[_DType]: ...
    def repeat(self, repeats: Union[int, List[int]], axis: Optional[_AxisType] = ...) -> Series[_DType]: ...
    def replace(self, to_replace: Optional[Union[str, List, Dict, Series[_DType], int, float]] = ..., value: Optional[Union[_Scalar, Dict, List, _str]] = ..., inplace: _bool = ..., limit: Optional[int] = ..., regex: Any = ..., method: Optional[Literal['pad', 'ffill', 'bfill']] = ...) -> Series[_DType]:
        '''Replace values given in `to_replace` with `value`.

Values of the Series are replaced with other values dynamically.
This differs from updating with ``.loc`` or ``.iloc``, which require
you to specify a location to update with some value.

Parameters
----------
to_replace : str, regex, list, dict, Series, int, float, or None
    How to find the values that will be replaced.

    * numeric, str or regex:

        - numeric: numeric values equal to `to_replace` will be
          replaced with `value`
        - str: string exactly matching `to_replace` will be replaced
          with `value`
        - regex: regexs matching `to_replace` will be replaced with
          `value`

    * list of str, regex, or numeric:

        - First, if `to_replace` and `value` are both lists, they
          **must** be the same length.
        - Second, if ``regex=True`` then all of the strings in **both**
          lists will be interpreted as regexs otherwise they will match
          directly. This doesn't matter much for `value` since there
          are only a few possible substitution regexes you can use.
        - str, regex and numeric rules apply as above.

    * dict:

        - Dicts can be used to specify different replacement values
          for different existing values. For example,
          ``{'a': 'b', 'y': 'z'}`` replaces the value 'a' with 'b' and
          'y' with 'z'. To use a dict in this way the `value`
          parameter should be `None`.
        - For a DataFrame a dict can specify that different values
          should be replaced in different columns. For example,
          ``{'a': 1, 'b': 'z'}`` looks for the value 1 in column 'a'
          and the value 'z' in column 'b' and replaces these values
          with whatever is specified in `value`. The `value` parameter
          should not be ``None`` in this case. You can treat this as a
          special case of passing two lists except that you are
          specifying the column to search in.
        - For a DataFrame nested dictionaries, e.g.,
          ``{'a': {'b': np.nan}}``, are read as follows: look in column
          'a' for the value 'b' and replace it with NaN. The `value`
          parameter should be ``None`` to use a nested dict in this
          way. You can nest regular expressions as well. Note that
          column names (the top-level dictionary keys in a nested
          dictionary) **cannot** be regular expressions.

    * None:

        - This means that the `regex` argument must be a string,
          compiled regular expression, or list, dict, ndarray or
          Series of such elements. If `value` is also ``None`` then
          this **must** be a nested dictionary or Series.

    See the examples section for examples of each of these.
value : scalar, dict, list, str, regex, default None
    Value to replace any values matching `to_replace` with.
    For a DataFrame a dict of values can be used to specify which
    value to use for each column (columns not in the dict will not be
    filled). Regular expressions, strings and lists or dicts of such
    objects are also allowed.
inplace : bool, default False
    If True, in place. Note: this will modify any
    other views on this object (e.g. a column from a DataFrame).
    Returns the caller if this is True.
limit : int, default None
    Maximum size gap to forward or backward fill.
regex : bool or same types as `to_replace`, default False
    Whether to interpret `to_replace` and/or `value` as regular
    expressions. If this is ``True`` then `to_replace` *must* be a
    string. Alternatively, this could be a regular expression or a
    list, dict, or array of regular expressions in which case
    `to_replace` must be ``None``.
method : {'pad', 'ffill', 'bfill', `None`}
    The method to use when for replacement, when `to_replace` is a
    scalar, list or tuple and `value` is ``None``.

    .. versionchanged:: 0.23.0
        Added to DataFrame.

Returns
-------
Series
    Object after replacement.

Raises
------
AssertionError
    * If `regex` is not a ``bool`` and `to_replace` is not
      ``None``.
TypeError
    * If `to_replace` is a ``dict`` and `value` is not a ``list``,
      ``dict``, ``ndarray``, or ``Series``
    * If `to_replace` is ``None`` and `regex` is not compilable
      into a regular expression or is a list, dict, ndarray, or
      Series.
    * When replacing multiple ``bool`` or ``datetime64`` objects and
      the arguments to `to_replace` does not match the type of the
      value being replaced
ValueError
    * If a ``list`` or an ``ndarray`` is passed to `to_replace` and
      `value` but they are not the same length.

See Also
--------
Series.fillna : Fill NA values.
Series.where : Replace values based on boolean condition.
Series.str.replace : Simple string replacement.

Notes
-----
* Regex substitution is performed under the hood with ``re.sub``. The
  rules for substitution for ``re.sub`` are the same.
* Regular expressions will only substitute on strings, meaning you
  cannot provide, for example, a regular expression matching floating
  point numbers and expect the columns in your frame that have a
  numeric dtype to be matched. However, if those floating point
  numbers *are* strings, then you can do this.
* This method has *a lot* of options. You are encouraged to experiment
  and play with this method to gain intuition about how it works.
* When dict is used as the `to_replace` value, it is like
  key(s) in the dict are the to_replace part and
  value(s) in the dict are the value parameter.

Examples
--------

**Scalar `to_replace` and `value`**

>>> s = pd.Series([0, 1, 2, 3, 4])
>>> s.replace(0, 5)
0    5
1    1
2    2
3    3
4    4
dtype: int64

>>> df = pd.DataFrame({'A': [0, 1, 2, 3, 4],
...                    'B': [5, 6, 7, 8, 9],
...                    'C': ['a', 'b', 'c', 'd', 'e']})
>>> df.replace(0, 5)
   A  B  C
0  5  5  a
1  1  6  b
2  2  7  c
3  3  8  d
4  4  9  e

**List-like `to_replace`**

>>> df.replace([0, 1, 2, 3], 4)
   A  B  C
0  4  5  a
1  4  6  b
2  4  7  c
3  4  8  d
4  4  9  e

>>> df.replace([0, 1, 2, 3], [4, 3, 2, 1])
   A  B  C
0  4  5  a
1  3  6  b
2  2  7  c
3  1  8  d
4  4  9  e

>>> s.replace([1, 2], method='bfill')
0    0
1    3
2    3
3    3
4    4
dtype: int64

**dict-like `to_replace`**

>>> df.replace({0: 10, 1: 100})
     A  B  C
0   10  5  a
1  100  6  b
2    2  7  c
3    3  8  d
4    4  9  e

>>> df.replace({'A': 0, 'B': 5}, 100)
     A    B  C
0  100  100  a
1    1    6  b
2    2    7  c
3    3    8  d
4    4    9  e

>>> df.replace({'A': {0: 100, 4: 400}})
     A  B  C
0  100  5  a
1    1  6  b
2    2  7  c
3    3  8  d
4  400  9  e

**Regular expression `to_replace`**

>>> df = pd.DataFrame({'A': ['bat', 'foo', 'bait'],
...                    'B': ['abc', 'bar', 'xyz']})
>>> df.replace(to_replace=r'^ba.$', value='new', regex=True)
      A    B
0   new  abc
1   foo  new
2  bait  xyz

>>> df.replace({'A': r'^ba.$'}, {'A': 'new'}, regex=True)
      A    B
0   new  abc
1   foo  bar
2  bait  xyz

>>> df.replace(regex=r'^ba.$', value='new')
      A    B
0   new  abc
1   foo  new
2  bait  xyz

>>> df.replace(regex={r'^ba.$': 'new', 'foo': 'xyz'})
      A    B
0   new  abc
1   xyz  new
2  bait  xyz

>>> df.replace(regex=[r'^ba.$', 'foo'], value='new')
      A    B
0   new  abc
1   new  new
2  bait  xyz

Note that when replacing multiple ``bool`` or ``datetime64`` objects,
the data types in the `to_replace` parameter must match the data
type of the value being replaced:

>>> df = pd.DataFrame({'A': [True, False, True],
...                    'B': [False, True, False]})
>>> df.replace({'a string': 'new value', True: False})  # raises
Traceback (most recent call last):
    ...
TypeError: Cannot compare types 'ndarray(dtype=bool)' and 'str'

This raises a ``TypeError`` because one of the ``dict`` keys is not of
the correct type for replacement.

Compare the behavior of ``s.replace({'a': None})`` and
``s.replace('a', None)`` to understand the peculiarities
of the `to_replace` parameter:

>>> s = pd.Series([10, 'a', 'a', 'b', 'a'])

When one uses a dict as the `to_replace` value, it is like the
value(s) in the dict are equal to the `value` parameter.
``s.replace({'a': None})`` is equivalent to
``s.replace(to_replace={'a': None}, value=None, method=None)``:

>>> s.replace({'a': None})
0      10
1    None
2    None
3       b
4    None
dtype: object

When ``value=None`` and `to_replace` is a scalar, list or
tuple, `replace` uses the method parameter (default 'pad') to do the
replacement. So this is why the 'a' values are being replaced by 10
in rows 1 and 2 and 'b' in row 4 in this case.
The command ``s.replace('a', None)`` is actually equivalent to
``s.replace(to_replace='a', value=None, method='pad')``:

>>> s.replace('a', None)
0    10
1    10
2    10
3     b
4     b
dtype: object
'''
        pass
    # Next one should return a 'Resampler' object
    def resample(self, rule: Any, axis: _AxisType = ..., closed: Optional[_str] = ..., label: Optional[_str] = ..., convention: Literal['start', 'end', 's', 'e'] = ..., kind: Optional[Literal['timestamp', 'period']] = ..., loffset: Optional[Any] = ..., base: int = ..., on: _Optional[str] = ..., level: Optional[_LevelType] = ...) -> Any: ...
    def reset_index(self, level: Optional[_LevelType] = ..., drop: _bool = ..., name: Optional[object] = ..., inplace: _bool = ...) -> Series[_DType]: ...
    def rfloordiv(self, other: Any, level: Optional[_LevelType] = ..., fill_value: Optional[Union[float, None]] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def rmod(self, other: Union[Series[_DType], _Scalar], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def rmul(self, other: Union[Series[_DType], _Scalar], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    # Next one should return a window class
    def rolling(self, window: Any, min_periods: Optional[int] = ..., center: _bool = ..., win_type: Optional[_str] = ..., on: Optional[_str] = ..., axis: _AxisType = ..., closed: Optional[_str] = ...) -> Any: ...
    def round(self, decimals: int = ..., **kwargs) -> Series[_DType]: ...
    def rpow(self, other: Union[Series[_DType], _Scalar], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def rsub(self, other: Union[Series[_DType], _Scalar], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def rtruediv(self, other: Any, level: Optional[_LevelType] = ..., fill_value: Optional[Union[float, None]] = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def sample(self, n: Optional[int] = ..., frac: Optional[float] = ..., replace: _bool = ..., weights: Optional[Union[_str, _ListLike, _np.ndarray]] = ..., random_state: Optional[int] = ..., axis: Optional[_AxisType] = ...) -> Series[_DType]: ...
    @overload
    def searchsorted(self, value: _ListLike, side: Literal['left', 'right'] = ..., sorter: Optional[_ListLike] = ...) -> List[int]: ...
    @overload
    def searchsorted(self, value: _Scalar, side: Literal['left', 'right'] = ..., sorter: Optional[_ListLike] = ...) -> int:
        '''Find indices where elements should be inserted to maintain order.

Find the indices into a sorted Series `self` such that, if the
corresponding elements in `value` were inserted before the indices,
the order of `self` would be preserved.

.. note::

    The Series *must* be monotonically sorted, otherwise
    wrong locations will likely be returned. Pandas does *not*
    check this for you.

Parameters
----------
value : array_like
    Values to insert into `self`.
side : {'left', 'right'}, optional
    If 'left', the index of the first suitable location found is given.
    If 'right', return the last such index.  If there is no suitable
    index, return either 0 or N (where N is the length of `self`).
sorter : 1-D array_like, optional
    Optional array of integer indices that sort `self` into ascending
    order. They are typically the result of ``np.argsort``.

Returns
-------
int or array of int
    A scalar or array of insertion points with the
    same shape as `value`.

    .. versionchanged:: 0.24.0
        If `value` is a scalar, an int is now always returned.
        Previously, scalar inputs returned an 1-item array for
        :class:`Series` and :class:`Categorical`.

See Also
--------
sort_values
numpy.searchsorted

Notes
-----
Binary search is used to find the required insertion points.

Examples
--------

>>> x = pd.Series([1, 2, 3])
>>> x
0    1
1    2
2    3
dtype: int64

>>> x.searchsorted(4)
3

>>> x.searchsorted([0, 4])
array([0, 3])

>>> x.searchsorted([1, 3], side='left')
array([0, 2])

>>> x.searchsorted([1, 3], side='right')
array([1, 3])

>>> x = pd.Categorical(['apple', 'bread', 'bread',
                        'cheese', 'milk'], ordered=True)
[apple, bread, bread, cheese, milk]
Categories (4, object): [apple < bread < cheese < milk]

>>> x.searchsorted('bread')
1

>>> x.searchsorted(['bread'], side='right')
array([3])

If the values are not monotonically sorted, wrong locations
may be returned:

>>> x = pd.Series([2, 1, 3])
>>> x.searchsorted(1)
0  # wrong result, correct would be 1
'''
        pass
    @overload
    def sem(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def sem(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _Scalar: ...
    @overload
    def set_axis(self, labels: Union[Index, _ListLike], axis: _AxisType = ..., *, inplace: Literal[True]) -> None: ...
    @overload
    def set_axis(self, labels: Union[Index, _ListLike], axis: _AxisType = ..., inplace: Literal[False] = ...) -> Series[_DType]: ...
    def shift(self, periods: int = ..., freq: Optional[Any] = ..., axis: _AxisType = ..., fill_value: Optional[object] = ...) -> Series[_DType]:
        '''Shift index by desired number of periods with an optional time `freq`.

When `freq` is not passed, shift the index without realigning the data.
If `freq` is passed (in this case, the index must be date or datetime,
or it will raise a `NotImplementedError`), the index will be
increased using the periods and the `freq`.

Parameters
----------
periods : int
    Number of periods to shift. Can be positive or negative.
freq : DateOffset, tseries.offsets, timedelta, or str, optional
    Offset to use from the tseries module or time rule (e.g. 'EOM').
    If `freq` is specified then the index values are shifted but the
    data is not realigned. That is, use `freq` if you would like to
    extend the index when shifting and preserve the original data.
axis : {0 or 'index', 1 or 'columns', None}, default None
    Shift direction.
fill_value : object, optional
    The scalar value to use for newly introduced missing values.
    the default depends on the dtype of `self`.
    For numeric data, ``np.nan`` is used.
    For datetime, timedelta, or period data, etc. :attr:`NaT` is used.
    For extension dtypes, ``self.dtype.na_value`` is used.

    .. versionchanged:: 0.24.0

Returns
-------
Series
    Copy of input object, shifted.

See Also
--------
Index.shift : Shift values of Index.
DatetimeIndex.shift : Shift values of DatetimeIndex.
PeriodIndex.shift : Shift values of PeriodIndex.
tshift : Shift the time index, using the index's frequency if
    available.

Examples
--------
>>> df = pd.DataFrame({'Col1': [10, 20, 15, 30, 45],
...                    'Col2': [13, 23, 18, 33, 48],
...                    'Col3': [17, 27, 22, 37, 52]})

>>> df.shift(periods=3)
   Col1  Col2  Col3
0   NaN   NaN   NaN
1   NaN   NaN   NaN
2   NaN   NaN   NaN
3  10.0  13.0  17.0
4  20.0  23.0  27.0

>>> df.shift(periods=1, axis='columns')
   Col1  Col2  Col3
0   NaN  10.0  13.0
1   NaN  20.0  23.0
2   NaN  15.0  18.0
3   NaN  30.0  33.0
4   NaN  45.0  48.0

>>> df.shift(periods=3, fill_value=0)
   Col1  Col2  Col3
0     0     0     0
1     0     0     0
2     0     0     0
3    10    13    17
4    20    23    27
'''
        pass
    @overload
    def skew(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def skew(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _Scalar: ...
    def slice_shift(self, periods: int = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def sort_index(self, axis: _AxisType = ..., level: Optional[_LevelType] = ..., ascending: _bool = ..., inplace: _bool = ..., kind: Literal['quicksort', 'heapsort', 'mergesort'] = ..., na_position: Literal['first', 'last'] = ..., sort_remaining: _bool = ..., ignore_index: _bool = ...) -> Series[_DType]: ...
    def sort_values(self, axis: _AxisType = ..., ascending: _bool = ..., inplace: _bool = ..., kind: Literal['quicksort', 'heapsort', 'mergesort'] = ..., na_position: Literal['first', 'last'] = ..., ignore_index: _bool = ...) -> Series[_DType]: ...
    def squeeze(self, axis: Optional[_AxisType] = ...) -> _Scalar: ...
    @overload
    def std(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[float]: ...
    @overload
    def std(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> float: ...
    def str(self) -> strings.StringMethods: ...
    def sub(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., axis: Optional[_AxisType] = ...) -> float: ...
    def subtract(self, other: Union[num, _ListLike, Series[_DType]], level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., ) -> float: ...
    def sum(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: Optional[_LevelType] = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., **kwargs) -> float: ...
    def swapaxes(self, axis1: _AxisType, axis2: _AxisType, copy: _bool = ...) -> Series[_DType]: ...
    def swaplevel(self, i: _LevelType = ..., j: _LevelType = ..., copy: _bool = ...) -> Series[_DType]: ...
    def tail(self, n: int = ...) -> Series[_DType]: ...
    def take(self, indices: List, axis: _AxisType = ..., **kwargs) -> Series[_DType]:
        '''Return the elements in the given *positional* indices along an axis.

This means that we are not indexing according to actual values in
the index attribute of the object. We are indexing according to the
actual position of the element in the object.

Parameters
----------
indices : array-like
    An array of ints indicating which positions to take.
axis : {0 or 'index', 1 or 'columns', None}, default 0
    The axis on which to select elements. ``0`` means that we are
    selecting rows, ``1`` means that we are selecting columns.
is_copy : bool
    Before pandas 1.0, ``is_copy=False`` can be specified to ensure
    that the return value is an actual copy. Starting with pandas 1.0,
    ``take`` always returns a copy, and the keyword is therefore
    deprecated.

    .. deprecated:: 1.0.0
**kwargs
    For compatibility with :meth:`numpy.take`. Has no effect on the
    output.

Returns
-------
taken : same type as caller
    An array-like containing the elements taken from the object.

See Also
--------
DataFrame.loc : Select a subset of a DataFrame by labels.
DataFrame.iloc : Select a subset of a DataFrame by positions.
numpy.take : Take elements from an array along an axis.

Examples
--------
>>> df = pd.DataFrame([('falcon', 'bird', 389.0),
...                    ('parrot', 'bird', 24.0),
...                    ('lion', 'mammal', 80.5),
...                    ('monkey', 'mammal', np.nan)],
...                   columns=['name', 'class', 'max_speed'],
...                   index=[0, 2, 3, 1])
>>> df
     name   class  max_speed
0  falcon    bird      389.0
2  parrot    bird       24.0
3    lion  mammal       80.5
1  monkey  mammal        NaN

Take elements at positions 0 and 3 along the axis 0 (default).

Note how the actual indices selected (0 and 1) do not correspond to
our selected indices 0 and 3. That's because we are selecting the 0th
and 3rd rows, not rows whose indices equal 0 and 3.

>>> df.take([0, 3])
     name   class  max_speed
0  falcon    bird      389.0
1  monkey  mammal        NaN

Take elements at indices 1 and 2 along the axis 1 (column selection).

>>> df.take([1, 2], axis=1)
    class  max_speed
0    bird      389.0
2    bird       24.0
3  mammal       80.5
1  mammal        NaN

We may take elements using negative integers for positive indices,
starting from the end of the object, just like with Python lists.

>>> df.take([-1, -2])
     name   class  max_speed
1  monkey  mammal        NaN
3    lion  mammal       80.5
'''
        pass
    def to_clipboard(self, excel: _bool = ..., sep: Optional[_str] = ..., **kwargs) -> None: ...
    @overload
    def to_csv(self, path_or_buf: Optional[_Path_or_Buf], sep: _str = ..., na_rep: _str = ..., float_format: Optional[_str] = ..., columns: Optional[Sequence[Hashable]] = ..., header: Union[_bool, List[_str]] = ..., index: _bool = ..., index_label: Optional[Union[_bool, _str, Sequence[Hashable]]] = ..., mode: _str = ..., encoding: Optional[_str] = ..., compression: Union[_str, Mapping[_str, _str]] = ..., quoting: Optional[int] = ..., quotechar: _str = ..., line_terminator: Optional[_str] = ..., chunksize: Optional[int] = ..., date_format: Optional[_str] = ..., doublequote: _bool = ..., escapechar: Optional[_str] = ..., decimal: _str = ...) -> None: ...
    @overload
    def to_csv(self, sep: _str = ..., na_rep: _str = ..., float_format: Optional[_str] = ..., columns: Optional[Sequence[Hashable]] = ..., header: Union[_bool, List[_str]] = ..., index: _bool = ..., index_label: Optional[[_bool, _str, Sequence[Hashable]]] = ..., mode: _str = ..., encoding: Optional[_str] = ..., compression: Union[_str, Mapping[_str, _str]] = ..., quoting: Optional[int] = ..., quotechar: _str = ..., line_terminator: Optional[_str] = ..., chunksize: Optional[int] = ..., date_format: Optional[_str ]= ..., doublequote: _bool = ..., escapechar: Optional[_str] = ..., decimal: _str = ...) -> _str: ...
    def to_dict(self, into: Hashable = ...) -> Dict[_str, Any]: ...
    def to_excel(self, excel_writer: Any, sheet_name: _str = ..., na_rep: _str = ..., float_format: Optional[_str] = ..., columns: Optional[Union[_str, Sequence[_str]]] = ..., header: _bool = ..., index: _bool = ..., index_label: Optional[Union[_str, Sequence[_str]]] = ..., startrow: int = ..., startcol: int = ..., engine: Optional[_str] = ..., merge_cells: _bool = ..., encoding: Optional[_str] = ..., inf_rep: _str = ..., verbose: _bool = ..., freeze_panes: Optional[Tuple[int, int]] = ...) -> None: ...
    def to_frame(self, name: Optional[object] = ...) -> DataFrame: ...
    def to_hdf(self, path_or_buf: _Path_or_Buf, key: _str, mode: _str = ..., complevel: Optional[int] = ..., complib: Optional[_str] = ..., append: _bool = ..., format: Optional[_str] = ..., index: _bool = ..., min_itemsize: Optional[Union[int, Dict[_str, int]]] = ..., nan_rep: Optional[Any] = ..., dropna: Optional[_bool] = ..., data_columns: Optional[List[_str]] = ..., errors: _str = ..., encoding: _str = ...) -> None: ...
    @overload
    def to_json(self, path_or_buf: Optional[_Path_or_Buf], orient: Optional[Literal['split', 'records', 'index', 'columns', 'values', 'table']] = ..., date_format: Optional[Literal['epoch', 'iso']] = ..., double_precision: int = ..., force_ascii: _bool = ..., date_unit: Literal['s', 'ms', 'us', 'ns'] = ..., default_handler: Optional[Callable[[Any], Union[_str, int, float, _bool, List, Dict]]] = ..., lines: _bool = ..., compression: Literal['infer', 'gzip', 'bz2', 'zip', 'xz'] = ..., index: _bool = ..., indent: Optional[int] = ...) -> None: ...
    @overload
    def to_json(self, orient: Optional[Literal['split', 'records', 'index', 'columns', 'values', 'table']] = ..., date_format: Optional[Literal['epoch', 'iso']] = ..., double_precision: int = ..., force_ascii: _bool = ..., date_unit: Literal['s', 'ms', 'us', 'ns'] = ..., default_handler: Optional[Callable[[Any], Union[_str, int, float, _bool, List, Dict]]] = ..., lines: _bool = ..., compression: Literal['infer', 'gzip', 'bz2', 'zip', 'xz'] = ..., index: _bool = ..., indent: Optional[int] = ...) -> _str: ...
    @overload
    def to_latex(self, buf: Optional[_Path_or_Buf], columns: Optional[List[_str]] = ..., col_space: Optional[int] = ..., header: _bool = ..., index: _bool = ..., na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., bold_rows: _bool = ..., column_format: Optional[_str] = ..., longtable: Optional[_bool] = ..., escape: Optional[_bool] = ..., encoding: Optional[_str] = ..., decimal: _str = ..., multicolumn: Optional[_bool] = ..., multicolumn_format: Optional[_str] = ..., multirow: Optional[_bool] = ..., caption: Optional[_str] = ..., label: Optional[_str] = ...) -> None: ...
    @overload
    def to_latex(self, columns: Optional[List[_str]] = ..., col_space: Optional[int] = ..., header: _bool = ..., index: _bool = ..., na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., bold_rows: _bool = ..., column_format: Optional[_str] = ..., longtable: Optional[_bool] = ..., escape: Optional[_bool] = ..., encoding: Optional[_str] = ..., decimal: _str = ..., multicolumn: Optional[_bool] = ..., multicolumn_format: Optional[_str] = ..., multirow: Optional[_bool] = ..., caption: Optional[_str] = ..., label: Optional[_str] = ...) -> _str: ...
    def to_list(self) -> List: ...
    @overload
    def to_markdown(self, buf: Optional[_Path_or_Buf], mode: Optional[_str] = ..., **kwargs) -> None:
        '''Print Series in Markdown-friendly format.

.. versionadded:: 1.0.0

Parameters
----------
buf : writable buffer, defaults to sys.stdout
    Where to send the output. By default, the output is printed to
    sys.stdout. Pass a writable buffer if you need to further process
    the output.
mode : str, optional
    Mode in which file is opened.
**kwargs
    These parameters will be passed to `tabulate`.

Returns
-------
str
    Series in Markdown-friendly format.

        Examples
        --------
        >>> s = pd.Series(["elk", "pig", "dog", "quetzal"], name="animal")
        >>> print(s.to_markdown())
        |    | animal   |
        |---:|:---------|
        |  0 | elk      |
        |  1 | pig      |
        |  2 | dog      |
        |  3 | quetzal  |
'''
        pass
    @overload
    def to_markdown(self, mode: Optional[_str] = ...,) -> _str: ...
    def to_numpy(self, dtype: Optional[Type[_DTypeNp]] = ..., copy: _bool = ..., na_value: Any = ..., *args, **kwargs) -> _np.ndarray[_DTypeNp]: ...
    def to_period(self, freq: Optional[_str] = ..., copy: _bool = ...) -> DataFrame: ...
    def to_pickle(self, path: _str, compression: Literal['infer', 'gzip', 'bz2', 'zip', 'xz'] = ..., protocol: int = ...) -> None: ...
    def to_records(self, index: _bool = ..., column_dtypes: Optional[Union[_str, Dict]] = ..., index_dtypes: Optional[Union[_str, Dict]] = ...) -> Any: ...
    def to_sql(self, name: _str, con: Any, schema: Optional[_str] = ..., if_exists: _str = ..., index: _bool = ..., index_label: Optional[Union[_str, Sequence[_str]]] = ..., chunksize: Optional[int] = ..., dtype: Optional[Union[Dict, _Scalar]] = ..., method: Optional[Union[_str, Callable]] = ...) -> None: ...
    @overload
    def to_string(self, buf: Optional[_Path_or_Buf], na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., justify: Optional[_str] = ..., max_rows: Optional[int] = ..., min_rows: Optional[int] = ..., max_cols: Optional[int] = ..., show_dimensions: _bool = ..., decimal: _str = ..., line_width: Optional[int] = ..., max_colwidth: Optional[int] = ..., encoding: Optional[_str] = ...) -> None: ...
    @overload
    def to_string(self, na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., justify: Optional[_str] = ..., max_rows: Optional[int] = ..., min_rows: Optional[int] = ..., max_cols: Optional[int] = ..., show_dimensions: _bool = ..., decimal: _str = ..., line_width: Optional[int] = ..., max_colwidth: Optional[int] = ..., encoding: Optional[_str] = ...) -> _str: ...
    def to_timestamp(self, freq: Optional[Any] = ..., how: Literal[('start', 'end', 's', 'e')] = ..., copy: _bool = ...) -> Series[_DType]: ...
    def to_xarray(self) -> Any: ... # xarray.DataArray
    def tolist(self) -> List: ...
    def transform(self, func: Union[List[Callable], Dict[_str, Callable]], axis: _AxisType = ..., **kwargs) -> Series[_DType]:
        '''Call ``func`` on self producing a Series with transformed values.

Produced Series will have same axis length as self.

Parameters
----------
func : function, str, list or dict
    Function to use for transforming the data. If a function, must either
    work when passed a Series or when passed to Series.apply.

    Accepted combinations are:

    - function
    - string function name
    - list of functions and/or function names, e.g. ``[np.exp. 'sqrt']``
    - dict of axis labels -> functions, function names or list of such.
axis : {0 or 'index'}
    Parameter needed for compatibility with DataFrame.
*args
    Positional arguments to pass to `func`.
**kwargs
    Keyword arguments to pass to `func`.

Returns
-------
Series
    A Series that must have the same length as self.

Raises
------
ValueError : If the returned Series has a different length than self.

See Also
--------
Series.agg : Only perform aggregating type operations.
Series.apply : Invoke function on a Series.

Examples
--------
>>> df = pd.DataFrame({'A': range(3), 'B': range(1, 4)})
>>> df
   A  B
0  0  1
1  1  2
2  2  3
>>> df.transform(lambda x: x + 1)
   A  B
0  1  2
1  2  3
2  3  4

Even though the resulting Series must have the same length as the
input Series, it is possible to provide several input functions:

>>> s = pd.Series(range(3))
>>> s
0    0
1    1
2    2
dtype: int64
>>> s.transform([np.sqrt, np.exp])
       sqrt        exp
0  0.000000   1.000000
1  1.000000   2.718282
2  1.414214   7.389056
'''
        pass
    def transpose(self, *args, **kwargs) -> Series[_DType]: ...
    def truediv(self, other: Any, level: Optional[_LevelType] = ..., fill_value: Optional[Union[float, None]] = ..., axis: _AxisType = ...) -> Series[float]: ...
    def truncate(self, before: Optional[Union[datetime.date, _str, int]] = ..., after: Optional[Union[datetime.date, _str, int]] = ..., axis: Optional[_AxisType] = ..., copy: _bool = ...) -> Series[_DType]: ...
    def tshift(self, periods: _int = ..., freq: Any = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def tz_convert(self, tz: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., copy: _bool = ...) -> Series[_DType]: ...
    def tz_localize(self, tz: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., copy: _bool = ..., ambiguous: Any = ..., nonexistent: _str = ...) -> Series[_DType]: ...
    def unique(self) -> _np.ndarray: ...
    def unstack(self, level: _LevelType = ..., fill_value: Optional[Union[int, _srt, Dict]] = ...) -> DataFrame: ...
    def update(self, other: Series[_DType]) -> None: ...
    def value_counts(self, normalize: _bool = ..., sort: _bool = ..., ascending: _bool = ..., bins: Optional[int] = ..., dropna: _bool = ...) -> Series[_DType]: ...
    @overload
    def var(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> Series[_DType]: ...
    @overload
    def var(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> _Scalar: ...
    def view(self, dtype: Optional[Any] = ...) -> Series[_DType]: ...
    def where(self, cond: Union[Series[_DType], Series[_DType], _np.ndarray], other: Any = ..., inplace: _bool = ..., axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., errors: _str = ..., try_cast: _bool = ...) -> Series[_DType]: ...
    def xs(self, key: Union[_str, Tuple[_str]], axis: _AxisType = ..., level: Optional[_LevelType] = ..., drop_level: _bool = ...) -> Series[_DType]: ...


class DataFrame:

    _ListLike = Union[_np.ndarray, List[_DType], Dict[_str, _np.ndarray], Sequence, Index, Series[_DType]]

    def __init__( self, data: Optional[Union[_ListLike, DataFrame, Dict[_str, Any]]] = ..., index: Optional[_ListLike] = ..., columns: Optional[_ListLike] = ..., dtype: Any = ..., copy: bool = ...): ...
    Name: _str
    #
    # dunder methods
    def __add__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __and__(self, other: Union[num, _ListLike, DataFrame], axis: _AxisType = ...) -> DataFrame: ...
    def __delitem__(self, key: _str) -> None: ...
    def __div__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __eq__(self, other: Union[float, Series[_DType], DataFrame]) -> DataFrame: ...  # type: ignore
    def __exp__(self, other: Union[num, _ListLike, DataFrame], axis: _AxisType = ..., level: _LevelType = ..., fill_value: Union[None, float] = ...) -> DataFrame: ...
    def __floordiv__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    @overload
    def __getitem__(self, idx: _str) -> Series[_DType]: ...
    @overload
    def __getitem__(self, rows: slice) -> DataFrame: ...
    @overload
    def __getitem__(self, idx: Union[Series[_bool], DataFrame, List[_str], Index[_str], _np.ndarray[_np.str_]],) -> DataFrame: ...
    def __iter__(self) -> Iterator: ...
    def __len__(self) -> int: ...
    def __setitem__(self, key: Any, value: Any) -> None: ...
    def __le__(self, other: float) -> DataFrame: ...
    def __lt__(self, other: float) -> DataFrame: ...
    def __ge__(self, other: float) -> DataFrame: ...
    def __gt__(self, other: float) -> DataFrame: ...
    def __mod__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __mul__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __pow__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __ne__(self, other: Union[float, Series[_DType], DataFrame]) -> DataFrame: ...  # type: ignore
    def __or__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __radd__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rand__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rdiv__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rfloordiv__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rmod__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rmul__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rnatmul__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __ror__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rpow__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rsub__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __rtruediv__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...    
    def __rxor__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __truediv__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...    
    def __mul__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __sub__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...
    def __xor__(self, other: Union[num, _ListLike, DataFrame]) -> DataFrame: ...

    # properties
    @property
    def at(self) -> Any: ...  # Not sure what to do with this yet; look at source
    @property
    def axes(self) -> Tuple[List[Any], List[Any]]: ...
    @property
    def bool(self) -> _bool: ...
    @property
    def columns(self) -> Index[_str]: ...
    @columns.setter  # setter needs to be right next to getter; otherwise mypy complains
    def columns(self, cols: Union[List[_str], Index[_str]]) -> None: ...
    @property
    def dtypes(self) -> Series[_DType]: ...
    @property
    def empty(self) -> _bool: ...
    @property
    def iat(self) -> Any: ...  # Not sure what to do with this yet; look at source
    @property
    def iloc(self) -> _iLocIndexerFrame: ...
    @property
    def index(self) -> Index[int]: ...
    @index.setter
    def index(self, idx: Index) -> None: ...
    @property
    def loc(self) -> _LocIndexerFrame: ...
    @property
    def ndim(self) -> int: ...
    @property
    def shape(self) -> Tuple[int, ...]: ...
    @property
    def size(self) -> int: ...
    @property
    def str(self) -> strings.StringMethods: ...
    @property
    def T(self) -> DataFrame: ...
    # this function is deprecated:
    @property
    def values(self) -> _np.ndarray: ...

    # methods
    def abs(self) -> DataFrame: ...
    def add(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def add_prefix(self, prefix: str) -> DataFrame: ...
    def add_suffix(self, prefix: str) -> DataFrame: ...
    @overload
    def agg(self, func: Union[Callable, _str], axis: _AxisType = ..., **kwargs) -> Series[_DType]: ...
    @overload
    def agg(self, func: Union[List[Callable], Dict[_str, Callable]], axis: _AxisType = ..., **kwargs) -> DataFrame: ...
    @overload
    def aggregate(self, func: Union[Callable, _str], axis: _AxisType = ..., **kwargs) -> Series[_DType]:
        '''Aggregate using one or more operations over the specified axis.

.. versionadded:: 0.20.0

Parameters
----------
func : function, str, list or dict
    Function to use for aggregating the data. If a function, must either
    work when passed a DataFrame or when passed to DataFrame.apply.

    Accepted combinations are:

    - function
    - string function name
    - list of functions and/or function names, e.g. ``[np.sum, 'mean']``
    - dict of axis labels -> functions, function names or list of such.
axis : {0 or 'index', 1 or 'columns'}, default 0
        If 0 or 'index': apply function to each column.
        If 1 or 'columns': apply function to each row.
*args
    Positional arguments to pass to `func`.
**kwargs
    Keyword arguments to pass to `func`.

Returns
-------
scalar, Series or DataFrame

    The return can be:

    * scalar : when Series.agg is called with single function
    * Series : when DataFrame.agg is called with a single function
    * DataFrame : when DataFrame.agg is called with several functions

    Return scalar, Series or DataFrame.

The aggregation operations are always performed over an axis, either the
index (default) or the column axis. This behavior is different from
`numpy` aggregation functions (`mean`, `median`, `prod`, `sum`, `std`,
`var`), where the default is to compute the aggregation of the flattened
array, e.g., ``numpy.mean(arr_2d)`` as opposed to
``numpy.mean(arr_2d, axis=0)``.

`agg` is an alias for `aggregate`. Use the alias.

See Also
--------
DataFrame.apply : Perform any type of operations.
DataFrame.transform : Perform transformation type operations.
core.groupby.GroupBy : Perform operations over groups.
core.resample.Resampler : Perform operations over resampled bins.
core.window.Rolling : Perform operations over rolling window.
core.window.Expanding : Perform operations over expanding window.
core.window.EWM : Perform operation over exponential weighted
    window.

Notes
-----
`agg` is an alias for `aggregate`. Use the alias.

A passed user-defined-function will be passed a Series for evaluation.

Examples
--------
>>> df = pd.DataFrame([[1, 2, 3],
...                    [4, 5, 6],
...                    [7, 8, 9],
...                    [np.nan, np.nan, np.nan]],
...                   columns=['A', 'B', 'C'])

Aggregate these functions over the rows.

>>> df.agg(['sum', 'min'])
        A     B     C
sum  12.0  15.0  18.0
min   1.0   2.0   3.0

Different aggregations per column.

>>> df.agg({'A' : ['sum', 'min'], 'B' : ['min', 'max']})
        A    B
max   NaN  8.0
min   1.0  2.0
sum  12.0  NaN

Aggregate over the columns.

>>> df.agg("mean", axis="columns")
0    2.0
1    5.0
2    8.0
3    NaN
dtype: float64
'''
        pass
    @overload
    def aggregate(self, func: Union[List[Callable], Dict[_str, Callable]], axis: _AxisType = ..., **kwargs) -> DataFrame: ...
    def align(self, other: Union[DataFrame, Series[_DType]], join: Literal['inner', 'outer', 'left', 'right'] = ..., axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., copy: _bool = ..., fill_value: Optional[Any] = ..., method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill']] = ..., limit: Optional[int] = ..., fill_axis: _AxisType = ..., broadcast_axis: Optional[_AxisType] = ...) -> DataFrame:
        '''Align two objects on their axes with the specified join method.

Join method is specified for each axis Index.

Parameters
----------
other : DataFrame or Series
join : {'outer', 'inner', 'left', 'right'}, default 'outer'
axis : allowed axis of the other object, default None
    Align on index (0), columns (1), or both (None).
level : int or level name, default None
    Broadcast across a level, matching Index values on the
    passed MultiIndex level.
copy : bool, default True
    Always returns new objects. If copy=False and no reindexing is
    required then original objects are returned.
fill_value : scalar, default np.NaN
    Value to use for missing values. Defaults to NaN, but can be any
    "compatible" value.
method : {'backfill', 'bfill', 'pad', 'ffill', None}, default None
    Method to use for filling holes in reindexed Series:

    - pad / ffill: propagate last valid observation forward to next valid.
    - backfill / bfill: use NEXT valid observation to fill gap.

limit : int, default None
    If method is specified, this is the maximum number of consecutive
    NaN values to forward/backward fill. In other words, if there is
    a gap with more than this number of consecutive NaNs, it will only
    be partially filled. If method is not specified, this is the
    maximum number of entries along the entire axis where NaNs will be
    filled. Must be greater than 0 if not None.
fill_axis : {0 or 'index', 1 or 'columns'}, default 0
    Filling axis, method and limit.
broadcast_axis : {0 or 'index', 1 or 'columns'}, default None
    Broadcast values along this axis, if aligning two objects of
    different dimensions.

Returns
-------
(left, right) : (DataFrame, type of other)
    Aligned objects.
'''
        pass
    @overload
    def all(self, axis: _AxisType = ..., bool_only: Optional[_bool] = ..., skipna: _bool = ..., level: None = ..., **kwargs) -> Series[_DType]: ...
    @overload
    def all(self, axis: _AxisType = ..., bool_only: Optional[_bool] = ..., skipna: _bool = ...,*, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def any(self, axis: _AxisType = ..., bool_only: Optional[_bool] = ..., skipna: _bool = ...,level: None = ..., **kwargs) -> Series[_DType]: ...
    @overload
    def any(self, axis: _AxisType = ..., bool_only: _bool = ..., skipna: _bool = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    def append(self, other: Union[DataFrame, Series[_DType], Dict[_str, Any]], ignore_index: _bool = ..., verify_integrity: _bool = ..., sort: _bool = ...) -> DataFrame: ...
    @overload
    def apply(self, f: Callable[..., int]) -> Series[_DType]: ...
    @overload
    def apply(self, f: Callable, axis: _AxisType = ..., raw: _bool = ..., result_type: Optional[_str] = ...) -> DataFrame: ...
    def applymap(self, func: Callable) -> DataFrame: ...
    def asof(self, where: Any, subset: Optional[Union[_str, List[_str]]] = ...) -> DataFrame: ...
    def assign(self, **kwargs) -> DataFrame: ...
    def asfreq(self, freq: Any, method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill']] = ..., how: Optional[Literal['start', 'end']] = ..., normalize: _bool = ..., fill_value: Optional[_Scalar] = ...) -> DataFrame: ...
    def astype(self, dtype: Union[_str, Dict[_str, _str]], copy: _bool = ..., errors: _str = ...) -> DataFrame: ...
    def at_time(self, time: Union[_str, datetime.time], asof: _bool = ..., axis: Optional[_AxisType] = ...) -> DataFrame: ...
    def between_time(self, start_time: Union[_str, datetime.time], end_time: Union[_str, datetime.time], include_start: _bool = ..., include_end: _bool = ..., axis: Optional[_AxisType] = ...) -> DataFrame: ...
    @overload
    def bfill(self, value: Optional[Union[float, Dict, Series[_DType], DataFrame]] = ..., axis: Optional[_AxisType] = ..., inplace: Optional[Literal[False]] = ..., limit: int = ..., downcast: Optional[Dict] = ...) -> DataFrame: ...
    @overload
    def bfill(self, value: Optional[Union[float, Dict, Series[_DType], DataFrame]] = ..., axis: Optional[_AxisType ]= ..., limit: int = ..., downcast: Optional[Dict] = ..., *, inplace: Literal[True]) -> None: ...
    def boxplot(self, column: Optional[Union[_str, List[_str]]] = ..., by: Optional[Union[_str, _ListLike]] = ..., ax: Optional[matplotlib.axes.Axes] = ..., fontsize: Optional[float, _str] = ..., rot: int = ..., grid: _bool = ..., figsize: Optional[Tuple[float, float]] = ..., layout: Optional[Tuple[int, int]] = ..., return_type: Optional[Literal['axes', 'dict', 'both']] = ..., backend: Optional[_str] = ..., **kwargs) -> Any: ...
    def clip(self, lower: Optional[float] = ..., upper: Optional[float] = ..., axis: Optional[_AxisType] = ..., inplace: _bool = ..., **kwargs) -> DataFrame: ...
    def combine(self, other: DataFrame, func: Callable, fill_value: Optional[Any] = ..., overwrite: _bool = ...) -> DataFrame: ...
    def combine_first(self, other: DataFrame) -> DataFrame: ...
    def convert_dtypes(self, infer_objects: _bool = ..., convert_string: _bool = ..., convert_integer: _bool = ..., convert__boolean: _bool = ...) -> DataFrame: ...
    def copy(self, deep: _bool = ...) -> DataFrame: ...
    def corr(self, method: Literal["pearson", "kendall", "spearman"] = ..., min_periods: int = ...) -> DataFrame: ...
    def corrwith(self, other: Union[DataFrame, Series[_DType]], axis: Optional[_AxisType] = ..., drop: _bool = ..., method: Literal["pearson", "kendall", "spearman"] = ...) -> Series: ...
    @overload
    def count(self, axis: _AxisType = ..., numeric_only: _bool = ..., *, level: _LevelType) -> DataFrame: ...
    @overload
    def count(self, axis: _AxisType = ..., level: None = ..., numeric_only: _bool = ...) -> Series[_DType]: ...
    def cov(self, min_periods: Optional[int] = ...) -> DataFrame: ...
    def cummax(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., **kwargs) -> DataFrame: ...
    def cummin(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., **kwargs) -> DataFrame: ...
    def cumprod(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., **kwargs) -> DataFrame: ...
    def cumsum(self, axis: Optional[_AxisType] = ..., skipna: _bool = ..., **kwargs) -> DataFrame: ...
    def describe(self, percentiles: Optional[List[float]] = ..., include: Optional[Union[Literal['all'], List[_dtype]]] = ..., exclude: Optional[List[_dtype]] = ...) -> DataFrame: ...
    def diff(self, periods: int = ..., axis: _AxisType = ...) -> DataFrame: ...
    def div(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def divide(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    @overload
    def dot(self, other: DataFrame) -> DataFrame: ...
    @overload
    def dot(self, other: Series[_DType]) -> Series[_DType]: ...
    def drop(self, labels: Optional[Union[_str, List]] = ..., axis: _AxisType = ..., index: Optional[Union[List[_str], List[int], Index]] = ..., columns: Optional[Union[_str, List]] = ..., level: Optional[_LevelType] = ..., inplace: _bool = ..., errors: Literal['ignore', 'raise'] = ...) -> DataFrame: ...
    def drop_duplicates(self, subset: Optional[Any] = ..., keep: Union[Literal['first', 'last'], _bool] = ..., inplace: _bool = ..., ignore_index: _bool = ...) -> DataFrame: ...
    def droplevel(self, level: _LevelType = ..., axis: _AxisType = ...) -> DataFrame: ...
    @overload
    def dropna(self, axis: _AxisType = ..., how: Literal['any', 'all'] = ..., thresh: Optional[int] = ..., subset: Optional[List] = ..., *, inplace: Literal[True]) -> None: ...
    @overload
    def dropna(self, axis: _AxisType = ..., how: Literal['any', 'all'] = ..., thresh: Optional[int] = ..., subset: Optional[ListO] = ..., inplace: Optional[Literal[False]] = ...) -> DataFrame: ...
    def duplicated(self, subset: Optional[Union[Hashable, Sequence[Hashable]]] = ..., keep: Union[Literal['first', 'last'], _bool] = ...)  -> Series[_DType]: ...
    def eq(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ...) -> DataFrame: ...
    def equals(self, other: Union[Series[_DType], DataFrame]) -> _bool: ...
    def eval(self, expr: _str, inplace: _bool = ...,**kwargs) -> Any: ...
    def ewm(self, com: Optional[float] = ..., span: Optional[float] = ..., halflife: Optional[float] = ..., alpha: Optional[float] = ..., min_periods: int = ..., adjust: _bool = ..., ignore_na: _bool = ..., axis: _AxisType = ...) -> DataFrame: ...
    def exp(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def expanding(self, min_periods: int = ..., center: _bool = ..., axis: _AxisType = ...) -> Any: ... # for now
    def explode(self, column: Union[str, Tuple]) -> DataFrame: ...
    @overload
    def ffill(self, value: Optional[Union[float, Dict, Series[_DType], DataFrame]] = ..., axis: Optional[_AxisType] = ..., inplace: Optional[Literal[False]] = ..., limit: int = ..., downcast: Optional[Dict] = ...) -> DataFrame: ...
    @overload
    def ffill(self, value: Optional[Union[float, Dict, Series, DataFrame]] = ..., axis: Optional[_AxisType ]= ..., limit: int = ..., downcast: Optional[Dict] = ..., *, inplace: Literal[True]) -> None: ...
    @overload
    def fillna(self, value: Optional[Union[float, Dict, Series, DataFrame]] = ..., method: Optional[Literal['backfill', 'bfill', 'ffill', 'pad']] = ..., axis: Optional[_AxisType] = ..., inplace: Optional[Literal[False]] = ..., limit: int = ..., downcast: Optional[Dict] = ...) -> DataFrame:
        '''Fill NA/NaN values using the specified method.

Parameters
----------
value : scalar, dict, Series, or DataFrame
    Value to use to fill holes (e.g. 0), alternately a
    dict/Series/DataFrame of values specifying which value to use for
    each index (for a Series) or column (for a DataFrame).  Values not
    in the dict/Series/DataFrame will not be filled. This value cannot
    be a list.
method : {'backfill', 'bfill', 'pad', 'ffill', None}, default None
    Method to use for filling holes in reindexed Series
    pad / ffill: propagate last valid observation forward to next valid
    backfill / bfill: use next valid observation to fill gap.
axis : {0 or 'index', 1 or 'columns'}
    Axis along which to fill missing values.
inplace : bool, default False
    If True, fill in-place. Note: this will modify any
    other views on this object (e.g., a no-copy slice for a column in a
    DataFrame).
limit : int, default None
    If method is specified, this is the maximum number of consecutive
    NaN values to forward/backward fill. In other words, if there is
    a gap with more than this number of consecutive NaNs, it will only
    be partially filled. If method is not specified, this is the
    maximum number of entries along the entire axis where NaNs will be
    filled. Must be greater than 0 if not None.
downcast : dict, default is None
    A dict of item->dtype of what to downcast if possible,
    or the string 'infer' which will try to downcast to an appropriate
    equal type (e.g. float64 to int64 if possible).

Returns
-------
DataFrame or None
    Object with missing values filled or None if ``inplace=True``.

See Also
--------
interpolate : Fill NaN values using interpolation.
reindex : Conform object to new index.
asfreq : Convert TimeSeries to specified frequency.

Examples
--------
>>> df = pd.DataFrame([[np.nan, 2, np.nan, 0],
...                    [3, 4, np.nan, 1],
...                    [np.nan, np.nan, np.nan, 5],
...                    [np.nan, 3, np.nan, 4]],
...                   columns=list('ABCD'))
>>> df
     A    B   C  D
0  NaN  2.0 NaN  0
1  3.0  4.0 NaN  1
2  NaN  NaN NaN  5
3  NaN  3.0 NaN  4

Replace all NaN elements with 0s.

>>> df.fillna(0)
    A   B   C   D
0   0.0 2.0 0.0 0
1   3.0 4.0 0.0 1
2   0.0 0.0 0.0 5
3   0.0 3.0 0.0 4

We can also propagate non-null values forward or backward.

>>> df.fillna(method='ffill')
    A   B   C   D
0   NaN 2.0 NaN 0
1   3.0 4.0 NaN 1
2   3.0 4.0 NaN 5
3   3.0 3.0 NaN 4

Replace all NaN elements in column 'A', 'B', 'C', and 'D', with 0, 1,
2, and 3 respectively.

>>> values = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
>>> df.fillna(value=values)
    A   B   C   D
0   0.0 2.0 2.0 0
1   3.0 4.0 2.0 1
2   0.0 1.0 2.0 5
3   0.0 3.0 2.0 4

Only replace the first NaN element.

>>> df.fillna(value=values, limit=1)
    A   B   C   D
0   0.0 2.0 2.0 0
1   3.0 4.0 NaN 1
2   NaN 1.0 NaN 5
3   NaN 3.0 NaN 4
'''
        pass
    @overload
    def fillna(self, value: Optional[Union[float, Dict, Series, DataFrame]] = ..., method: Optional[Literal['backfill', 'bfill', 'ffill', 'pad']] = ..., axis: Optional[_AxisType ]= ..., limit: int = ..., downcast: Optional[Dict] = ..., *, inplace: Literal[True]) -> None: ...
    def filter(self , items: Optional[List] = ..., like: Optional[_str] = ..., regex: Optional[_str] = ..., axis: Optional[_AxisType] = ...) -> DataFrame: ...
    def first(self, offset: Any) -> DataFrame: ...
    def first_valid_index(self) -> _Scalar: ...
    def floordiv(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    # def from_dict
    # def from_records
    def fulldiv(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def ge(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ...) -> DataFrame: ...
    # def get
    @overload
    def groupby(self, by: Optional[List[_str]], axis: _AxisType = ..., level: Optional[_LevelType] = ..., as_index: _bool = ..., sort: _bool = ..., group_keys: _bool = ..., squeeze: _bool = ..., observed: _bool = ...) -> DataFrameGroupBy:
        '''Group DataFrame using a mapper or by a Series of columns.

A groupby operation involves some combination of splitting the
object, applying a function, and combining the results. This can be
used to group large amounts of data and compute operations on these
groups.

Parameters
----------
by : mapping, function, label, or list of labels
    Used to determine the groups for the groupby.
    If ``by`` is a function, it's called on each value of the object's
    index. If a dict or Series is passed, the Series or dict VALUES
    will be used to determine the groups (the Series' values are first
    aligned; see ``.align()`` method). If an ndarray is passed, the
    values are used as-is determine the groups. A label or list of
    labels may be passed to group by the columns in ``self``. Notice
    that a tuple is interpreted as a (single) key.
axis : {0 or 'index', 1 or 'columns'}, default 0
    Split along rows (0) or columns (1).
level : int, level name, or sequence of such, default None
    If the axis is a MultiIndex (hierarchical), group by a particular
    level or levels.
as_index : bool, default True
    For aggregated output, return object with group labels as the
    index. Only relevant for DataFrame input. as_index=False is
    effectively "SQL-style" grouped output.
sort : bool, default True
    Sort group keys. Get better performance by turning this off.
    Note this does not influence the order of observations within each
    group. Groupby preserves the order of rows within each group.
group_keys : bool, default True
    When calling apply, add group keys to index to identify pieces.
squeeze : bool, default False
    Reduce the dimensionality of the return type if possible,
    otherwise return a consistent type.
observed : bool, default False
    This only applies if any of the groupers are Categoricals.
    If True: only show observed values for categorical groupers.
    If False: show all values for categorical groupers.

    .. versionadded:: 0.23.0

Returns
-------
DataFrameGroupBy
    Returns a groupby object that contains information about the groups.

See Also
--------
resample : Convenience method for frequency conversion and resampling
    of time series.

Notes
-----
See the `user guide
<https://pandas.pydata.org/pandas-docs/stable/groupby.html>`_ for more.

Examples
--------
>>> df = pd.DataFrame({'Animal': ['Falcon', 'Falcon',
...                               'Parrot', 'Parrot'],
...                    'Max Speed': [380., 370., 24., 26.]})
>>> df
   Animal  Max Speed
0  Falcon      380.0
1  Falcon      370.0
2  Parrot       24.0
3  Parrot       26.0
>>> df.groupby(['Animal']).mean()
        Max Speed
Animal
Falcon      375.0
Parrot       25.0

**Hierarchical Indexes**

We can groupby different levels of a hierarchical index
using the `level` parameter:

>>> arrays = [['Falcon', 'Falcon', 'Parrot', 'Parrot'],
...           ['Captive', 'Wild', 'Captive', 'Wild']]
>>> index = pd.MultiIndex.from_arrays(arrays, names=('Animal', 'Type'))
>>> df = pd.DataFrame({'Max Speed': [390., 350., 30., 20.]},
...                   index=index)
>>> df
                Max Speed
Animal Type
Falcon Captive      390.0
       Wild         350.0
Parrot Captive       30.0
       Wild          20.0
>>> df.groupby(level=0).mean()
        Max Speed
Animal
Falcon      370.0
Parrot       25.0
>>> df.groupby(level="Type").mean()
         Max Speed
Type
Captive      210.0
Wild         185.0
'''
        pass
    @overload
    def groupby(self, by: Optional[_str], axis: _AxisType = ..., level: Optional[_LevelType] = ..., as_index: _bool = ..., sort: _bool = ..., group_keys: _bool = ..., squeeze: _bool = ..., observed: _bool = ...) -> SeriesGroupBy: ...
    def gt(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ...) -> DataFrame: ...
    def head(self, n: int = ...) -> DataFrame: ...
    def hist(self, column: Optional[Union[_str, List[_str]]] = ..., by: Optional[Union[_str, _ListLike]] = ..., grid: _bool = ..., xlabelsize: Optional[int] = ..., xrot: Optional[float] = ..., ylabelsize: Optional[int] = ..., yrot: Optional[float] = ..., ax: Optional[matplotlib.axes.Axes] = ..., sharex: _bool = ..., sharey: _bool = ..., figsize: Optional[Tuple[float, float]] = ..., layout: Optional[Tuple[int, int]] = ..., bins: Union[int, List] = ..., backend: Optional[_str] = ..., **kwargs) -> Any: ...
    def idxmax(self, axis: _AxisType) -> Series[_DType]: ...
    def idxmin(self, axis: _AxisType) -> Series[_DType]: ...
    def infer_objects(self) -> DataFrame: ...
    # def info
    def insert(self, loc: int, column: Any, value: Union[int, _ListLike], allow_duplicates: _bool = ...) -> None: ... 
    @overload
    def interpolate(self, method: _str = ..., axis: _AxisType = ..., limit: Optional[int] = ..., limit_direction: Literal['forward', 'backward', 'both'] = ..., limit_area: Optional[Literal['inside', 'outside']] = ..., downcast: Optional[Literal['infer']] = ..., *, inplace: Literal[True], **kwargs) -> None: ...
    @overload
    def interpolate(self, method: _str = ..., axis: _AxisType = ..., limit: Optional[int ]= ..., inplace: Optional[Literal[False]] = ..., limit_direction: Literal['forward', 'backward', 'both'] = ..., limit_area: Optional[Literal['inside', 'outside']] = ..., downcast: Optional[Literal['infer']] = ..., **kwargs) -> DataFrame: ...
    def isin(self, values: Union[Iterable, Series[_DType], DataFrame, Dict]) -> DataFrame: ...
    def isna(self) -> DataFrame:
        '''Detect missing values.

Return a boolean same-sized object indicating if the values are NA.
NA values, such as None or :attr:`numpy.NaN`, gets mapped to True
values.
Everything else gets mapped to False values. Characters such as empty
strings ``''`` or :attr:`numpy.inf` are not considered NA values
(unless you set ``pandas.options.mode.use_inf_as_na = True``).

Returns
-------
DataFrame
    Mask of bool values for each element in DataFrame that
    indicates whether an element is not an NA value.

See Also
--------
DataFrame.isnull : Alias of isna.
DataFrame.notna : Boolean inverse of isna.
DataFrame.dropna : Omit axes labels with missing values.
isna : Top-level isna.

Examples
--------
Show which entries in a DataFrame are NA.

>>> df = pd.DataFrame({'age': [5, 6, np.NaN],
...                    'born': [pd.NaT, pd.Timestamp('1939-05-27'),
...                             pd.Timestamp('1940-04-25')],
...                    'name': ['Alfred', 'Batman', ''],
...                    'toy': [None, 'Batmobile', 'Joker']})
>>> df
   age       born    name        toy
0  5.0        NaT  Alfred       None
1  6.0 1939-05-27  Batman  Batmobile
2  NaN 1940-04-25              Joker

>>> df.isna()
     age   born   name    toy
0  False   True  False   True
1  False  False  False  False
2   True  False  False  False

Show which entries in a Series are NA.

>>> ser = pd.Series([5, 6, np.NaN])
>>> ser
0    5.0
1    6.0
2    NaN
dtype: float64

>>> ser.isna()
0    False
1    False
2     True
dtype: bool
'''
        pass
    def isnull(self) -> DataFrame:
        '''Detect missing values.

Return a boolean same-sized object indicating if the values are NA.
NA values, such as None or :attr:`numpy.NaN`, gets mapped to True
values.
Everything else gets mapped to False values. Characters such as empty
strings ``''`` or :attr:`numpy.inf` are not considered NA values
(unless you set ``pandas.options.mode.use_inf_as_na = True``).

Returns
-------
DataFrame
    Mask of bool values for each element in DataFrame that
    indicates whether an element is not an NA value.

See Also
--------
DataFrame.isnull : Alias of isna.
DataFrame.notna : Boolean inverse of isna.
DataFrame.dropna : Omit axes labels with missing values.
isna : Top-level isna.

Examples
--------
Show which entries in a DataFrame are NA.

>>> df = pd.DataFrame({'age': [5, 6, np.NaN],
...                    'born': [pd.NaT, pd.Timestamp('1939-05-27'),
...                             pd.Timestamp('1940-04-25')],
...                    'name': ['Alfred', 'Batman', ''],
...                    'toy': [None, 'Batmobile', 'Joker']})
>>> df
   age       born    name        toy
0  5.0        NaT  Alfred       None
1  6.0 1939-05-27  Batman  Batmobile
2  NaN 1940-04-25              Joker

>>> df.isna()
     age   born   name    toy
0  False   True  False   True
1  False  False  False  False
2   True  False  False  False

Show which entries in a Series are NA.

>>> ser = pd.Series([5, 6, np.NaN])
>>> ser
0    5.0
1    6.0
2    NaN
dtype: float64

>>> ser.isna()
0    False
1    False
2     True
dtype: bool
'''
        pass
    def items(self) -> Iterable[Tuple[Union[Hashable, None], Series[_DType]]]:
        '''Iterate over (column name, Series) pairs.

Iterates over the DataFrame columns, returning a tuple with
the column name and the content as a Series.

Yields
------
label : object
    The column names for the DataFrame being iterated over.
content : Series
    The column entries belonging to each label, as a Series.

See Also
--------
DataFrame.iterrows : Iterate over DataFrame rows as
    (index, Series) pairs.
DataFrame.itertuples : Iterate over DataFrame rows as namedtuples
    of the values.

Examples
--------
>>> df = pd.DataFrame({'species': ['bear', 'bear', 'marsupial'],
...                   'population': [1864, 22000, 80000]},
...                   index=['panda', 'polar', 'koala'])
>>> df
        species   population
panda   bear      1864
polar   bear      22000
koala   marsupial 80000
>>> for label, content in df.items():
...     print('label:', label)
...     print('content:', content, sep='\n')
...
label: species
content:
panda         bear
polar         bear
koala    marsupial
Name: species, dtype: object
label: population
content:
panda     1864
polar    22000
koala    80000
Name: population, dtype: int64
'''
        pass
    def iteritems(self) -> Iterable[Tuple[Union[Hashable, None], Series[_DType]]]:
        '''Iterate over (column name, Series) pairs.

Iterates over the DataFrame columns, returning a tuple with
the column name and the content as a Series.

Yields
------
label : object
    The column names for the DataFrame being iterated over.
content : Series
    The column entries belonging to each label, as a Series.

See Also
--------
DataFrame.iterrows : Iterate over DataFrame rows as
    (index, Series) pairs.
DataFrame.itertuples : Iterate over DataFrame rows as namedtuples
    of the values.

Examples
--------
>>> df = pd.DataFrame({'species': ['bear', 'bear', 'marsupial'],
...                   'population': [1864, 22000, 80000]},
...                   index=['panda', 'polar', 'koala'])
>>> df
        species   population
panda   bear      1864
polar   bear      22000
koala   marsupial 80000
>>> for label, content in df.items():
...     print('label:', label)
...     print('content:', content, sep='\n')
...
label: species
content:
panda         bear
polar         bear
koala    marsupial
Name: species, dtype: object
label: population
content:
panda     1864
polar    22000
koala    80000
Name: population, dtype: int64
'''
        pass
    def iterrows(self) ->  Iterable[Tuple[Union[Hashable, None], Series[_DType]]]: ...
    def itertuples(self, index: _bool = ..., name: Optional[_str] = ...) ->  Iterable[Tuple[Union[Hashable, None]]]: ...
    def join(self, other: Union[DataFrame, Series[_DType], List[DataFrame]], on: Optional[Union[_str, List[_str]]] = ..., how: Literal['left', 'right', 'outer', 'inner'] = ..., lsuffix: _str=..., rsuffix: _str = ..., sort: _bool = ...) -> DataFrame: ...
    def keys(self) -> Index: ...
    @overload
    def kurt(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def kurt(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...
    @overload
    def kurtosis(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def kurtosis(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...
    def last(self, offset: Any) -> DataFrame: ...
    def last_valid_index(self) -> Scalar: ...
    def le(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ...) -> DataFrame: ...
    def lookup(self, row_labels: Sequence, col_labels: Sequence) -> _np.ndarray: ...
    def lt(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ...) -> DataFrame: ...
    @overload
    def mad(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ...) -> Series[_DType]: ...
    @overload
    def mad(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., *, level: _LevelType,  **kwargs) -> DataFrame: ...
    def mask(self, cond: Union[Series[_DType], DataFrame, _np.ndarray], other: Any = ..., inplace: _bool = ..., axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., errors: _str =..., try_cast: _bool =...) -> DataFrame: ...
    @overload
    def max(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def max(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...
    @overload
    def mean(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def mean(self, axis:Optional[ _AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...
    @overload
    def median(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def median(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...
    def melt(self, id_vars: Optional[Any] = ..., value_vars: Optional[Any] = ..., var_name: Optional[Any] = ..., value_name: Any = ..., col_level: Optional[Union[int, _str]] = ...) -> DataFrame:
        '''Unpivot a DataFrame from wide to long format, optionally leaving identifiers set.

This function is useful to massage a DataFrame into a format where one
or more columns are identifier variables (`id_vars`), while all other
columns, considered measured variables (`value_vars`), are "unpivoted" to
the row axis, leaving just two non-identifier columns, 'variable' and
'value'.
.. versionadded:: 0.20.0

Parameters
----------
id_vars : tuple, list, or ndarray, optional
    Column(s) to use as identifier variables.
value_vars : tuple, list, or ndarray, optional
    Column(s) to unpivot. If not specified, uses all columns that
    are not set as `id_vars`.
var_name : scalar
    Name to use for the 'variable' column. If None it uses
    ``frame.columns.name`` or 'variable'.
value_name : scalar, default 'value'
    Name to use for the 'value' column.
col_level : int or str, optional
    If columns are a MultiIndex then use this level to melt.

Returns
-------
DataFrame
    Unpivoted DataFrame.

See Also
--------
melt
pivot_table
DataFrame.pivot
Series.explode

Examples
--------
>>> df = pd.DataFrame({'A': {0: 'a', 1: 'b', 2: 'c'},
...                    'B': {0: 1, 1: 3, 2: 5},
...                    'C': {0: 2, 1: 4, 2: 6}})
>>> df
   A  B  C
0  a  1  2
1  b  3  4
2  c  5  6

>>> df.melt(id_vars=['A'], value_vars=['B'])
   A variable  value
0  a        B      1
1  b        B      3
2  c        B      5

>>> df.melt(id_vars=['A'], value_vars=['B', 'C'])
   A variable  value
0  a        B      1
1  b        B      3
2  c        B      5
3  a        C      2
4  b        C      4
5  c        C      6

The names of 'variable' and 'value' columns can be customized:

>>> df.melt(id_vars=['A'], value_vars=['B'],
...         var_name='myVarname', value_name='myValname')
   A myVarname  myValname
0  a         B          1
1  b         B          3
2  c         B          5

If you have multi-index columns:

>>> df.columns = [list('ABC'), list('DEF')]
>>> df
   A  B  C
   D  E  F
0  a  1  2
1  b  3  4
2  c  5  6

>>> df.melt(col_level=0, id_vars=['A'], value_vars=['B'])
   A variable  value
0  a        B      1
1  b        B      3
2  c        B      5

>>> df.melt(id_vars=[('A', 'D')], value_vars=[('B', 'E')])
  (A, D) variable_0 variable_1  value
0      a          B          E      1
1      b          B          E      3
2      c          B          E      5
'''
        pass
    def memory_usage(self, index: _bool = ..., deep: _bool = ...) -> Series[_DType]: ...
    def merge(self, right: Union[DataFrame, Series[_DType]], how: Literal['left', 'right', 'inner', 'outer'] = ..., on: Optional[Union[_LevelType, List[_LevelType]]] = ..., left_on: Optional[Union[_LevelType, List[_LevelType]]] = ..., right_on: Optional[Union[_LevelType, List[_LevelType]]] = ..., left_index: _bool = ..., right_index: _bool = ..., sort: _bool = ..., suffixes: Tuple[_str, _str] = ..., copy: _bool = ..., indicator: Union[_bool, _str] = ..., validate: Optional[_str] = ...) -> DataFrame:
        '''Merge DataFrame or named Series objects with a database-style join.

The join is done on columns or indexes. If joining columns on
columns, the DataFrame indexes *will be ignored*. Otherwise if joining indexes
on indexes or indexes on a column or columns, the index will be passed on.

Parameters
----------
right : DataFrame or named Series
    Object to merge with.
how : {'left', 'right', 'outer', 'inner'}, default 'inner'
    Type of merge to be performed.

    * left: use only keys from left frame, similar to a SQL left outer join;
      preserve key order.
    * right: use only keys from right frame, similar to a SQL right outer join;
      preserve key order.
    * outer: use union of keys from both frames, similar to a SQL full outer
      join; sort keys lexicographically.
    * inner: use intersection of keys from both frames, similar to a SQL inner
      join; preserve the order of the left keys.
on : label or list
    Column or index level names to join on. These must be found in both
    DataFrames. If `on` is None and not merging on indexes then this defaults
    to the intersection of the columns in both DataFrames.
left_on : label or list, or array-like
    Column or index level names to join on in the left DataFrame. Can also
    be an array or list of arrays of the length of the left DataFrame.
    These arrays are treated as if they are columns.
right_on : label or list, or array-like
    Column or index level names to join on in the right DataFrame. Can also
    be an array or list of arrays of the length of the right DataFrame.
    These arrays are treated as if they are columns.
left_index : bool, default False
    Use the index from the left DataFrame as the join key(s). If it is a
    MultiIndex, the number of keys in the other DataFrame (either the index
    or a number of columns) must match the number of levels.
right_index : bool, default False
    Use the index from the right DataFrame as the join key. Same caveats as
    left_index.
sort : bool, default False
    Sort the join keys lexicographically in the result DataFrame. If False,
    the order of the join keys depends on the join type (how keyword).
suffixes : tuple of (str, str), default ('_x', '_y')
    Suffix to apply to overlapping column names in the left and right
    side, respectively. To raise an exception on overlapping columns use
    (False, False).
copy : bool, default True
    If False, avoid copy if possible.
indicator : bool or str, default False
    If True, adds a column to output DataFrame called "_merge" with
    information on the source of each row.
    If string, column with information on source of each row will be added to
    output DataFrame, and column will be named value of string.
    Information column is Categorical-type and takes on a value of "left_only"
    for observations whose merge key only appears in 'left' DataFrame,
    "right_only" for observations whose merge key only appears in 'right'
    DataFrame, and "both" if the observation's merge key is found in both.

validate : str, optional
    If specified, checks if merge is of specified type.

    * "one_to_one" or "1:1": check if merge keys are unique in both
      left and right datasets.
    * "one_to_many" or "1:m": check if merge keys are unique in left
      dataset.
    * "many_to_one" or "m:1": check if merge keys are unique in right
      dataset.
    * "many_to_many" or "m:m": allowed, but does not result in checks.

    .. versionadded:: 0.21.0

Returns
-------
DataFrame
    A DataFrame of the two merged objects.

See Also
--------
merge_ordered : Merge with optional filling/interpolation.
merge_asof : Merge on nearest keys.
DataFrame.join : Similar method using indices.

Notes
-----
Support for specifying index levels as the `on`, `left_on`, and
`right_on` parameters was added in version 0.23.0
Support for merging named Series objects was added in version 0.24.0

Examples
--------

>>> df1 = pd.DataFrame({'lkey': ['foo', 'bar', 'baz', 'foo'],
...                     'value': [1, 2, 3, 5]})
>>> df2 = pd.DataFrame({'rkey': ['foo', 'bar', 'baz', 'foo'],
...                     'value': [5, 6, 7, 8]})
>>> df1
    lkey value
0   foo      1
1   bar      2
2   baz      3
3   foo      5
>>> df2
    rkey value
0   foo      5
1   bar      6
2   baz      7
3   foo      8

Merge df1 and df2 on the lkey and rkey columns. The value columns have
the default suffixes, _x and _y, appended.

>>> df1.merge(df2, left_on='lkey', right_on='rkey')
  lkey  value_x rkey  value_y
0  foo        1  foo        5
1  foo        1  foo        8
2  foo        5  foo        5
3  foo        5  foo        8
4  bar        2  bar        6
5  baz        3  baz        7

Merge DataFrames df1 and df2 with specified left and right suffixes
appended to any overlapping columns.

>>> df1.merge(df2, left_on='lkey', right_on='rkey',
...           suffixes=('_left', '_right'))
  lkey  value_left rkey  value_right
0  foo           1  foo            5
1  foo           1  foo            8
2  foo           5  foo            5
3  foo           5  foo            8
4  bar           2  bar            6
5  baz           3  baz            7

Merge DataFrames df1 and df2, but raise an exception if the DataFrames have
any overlapping columns.

>>> df1.merge(df2, left_on='lkey', right_on='rkey', suffixes=(False, False))
Traceback (most recent call last):
...
ValueError: columns overlap but no suffix specified:
    Index(['value'], dtype='object')
'''
        pass
    @overload
    def min(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def min(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...
    @overload
    def mode(self, axis: _AxisType = ..., skipna: _bool = ..., numeric_only: _bool = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def mode(self, axis: _AxisType = ..., skipna: _bool = ..., level: None = ..., numeric_only: _bool = ..., **kwargs) -> Series[_DType]: ...
    def mod(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def mul(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...    
    def multiply(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def ne(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ...) -> DataFrame: ...
    def nlargest(self, n: int, columns: Union[_str, List[_str]], keep: Literal['first', 'last', 'all'] = ...) -> DataFrame: ...
    def nsmallest(self, n: int, columns: Union[_str, List[_str]], keep: Literal['first', 'last', 'all'] = ...) -> DataFrame: ...
    def notna(self) -> DataFrame:
        '''Detect existing (non-missing) values.

Return a boolean same-sized object indicating if the values are not NA.
Non-missing values get mapped to True. Characters such as empty
strings ``''`` or :attr:`numpy.inf` are not considered NA values
(unless you set ``pandas.options.mode.use_inf_as_na = True``).
NA values, such as None or :attr:`numpy.NaN`, get mapped to False
values.

Returns
-------
DataFrame
    Mask of bool values for each element in DataFrame that
    indicates whether an element is not an NA value.

See Also
--------
DataFrame.notnull : Alias of notna.
DataFrame.isna : Boolean inverse of notna.
DataFrame.dropna : Omit axes labels with missing values.
notna : Top-level notna.

Examples
--------
Show which entries in a DataFrame are not NA.

>>> df = pd.DataFrame({'age': [5, 6, np.NaN],
...                    'born': [pd.NaT, pd.Timestamp('1939-05-27'),
...                             pd.Timestamp('1940-04-25')],
...                    'name': ['Alfred', 'Batman', ''],
...                    'toy': [None, 'Batmobile', 'Joker']})
>>> df
   age       born    name        toy
0  5.0        NaT  Alfred       None
1  6.0 1939-05-27  Batman  Batmobile
2  NaN 1940-04-25              Joker

>>> df.notna()
     age   born  name    toy
0   True  False  True  False
1   True   True  True   True
2  False   True  True   True

Show which entries in a Series are not NA.

>>> ser = pd.Series([5, 6, np.NaN])
>>> ser
0    5.0
1    6.0
2    NaN
dtype: float64

>>> ser.notna()
0     True
1     True
2    False
dtype: bool
'''
        pass
    def notnull(self) -> DataFrame:
        '''Detect existing (non-missing) values.

Return a boolean same-sized object indicating if the values are not NA.
Non-missing values get mapped to True. Characters such as empty
strings ``''`` or :attr:`numpy.inf` are not considered NA values
(unless you set ``pandas.options.mode.use_inf_as_na = True``).
NA values, such as None or :attr:`numpy.NaN`, get mapped to False
values.

Returns
-------
DataFrame
    Mask of bool values for each element in DataFrame that
    indicates whether an element is not an NA value.

See Also
--------
DataFrame.notnull : Alias of notna.
DataFrame.isna : Boolean inverse of notna.
DataFrame.dropna : Omit axes labels with missing values.
notna : Top-level notna.

Examples
--------
Show which entries in a DataFrame are not NA.

>>> df = pd.DataFrame({'age': [5, 6, np.NaN],
...                    'born': [pd.NaT, pd.Timestamp('1939-05-27'),
...                             pd.Timestamp('1940-04-25')],
...                    'name': ['Alfred', 'Batman', ''],
...                    'toy': [None, 'Batmobile', 'Joker']})
>>> df
   age       born    name        toy
0  5.0        NaT  Alfred       None
1  6.0 1939-05-27  Batman  Batmobile
2  NaN 1940-04-25              Joker

>>> df.notna()
     age   born  name    toy
0   True  False  True  False
1   True   True  True   True
2  False   True  True   True

Show which entries in a Series are not NA.

>>> ser = pd.Series([5, 6, np.NaN])
>>> ser
0    5.0
1    6.0
2    NaN
dtype: float64

>>> ser.notna()
0     True
1     True
2    False
dtype: bool
'''
        pass
    def nunique(self, axis: _AxisType = ..., dropna=True) -> Series[_DType]: ...
    def pct_change(self, periods: int = ..., fill_method: _str = ..., limit: Optional[int] = ..., freq: Optional[Any] = ..., **kwargs) -> DataFrame: ...
    def pipe(self, func: Callable, **kwargs) -> Any: ...
    def pivot(self, index: Optional[Any] = ..., columns: Optional[Any] = ..., values: Optional[Any] = ...) -> DataFrame:
        '''Return reshaped DataFrame organized by given index / column values.

Reshape data (produce a "pivot" table) based on column values. Uses
unique values from specified `index` / `columns` to form axes of the
resulting DataFrame. This function does not support data
aggregation, multiple values will result in a MultiIndex in the
columns. See the :ref:`User Guide <reshaping>` for more on reshaping.

Parameters
----------
index : str or object, optional
    Column to use to make new frame's index. If None, uses
    existing index.
columns : str or object
    Column to use to make new frame's columns.
values : str, object or a list of the previous, optional
    Column(s) to use for populating new frame's values. If not
    specified, all remaining columns will be used and the result will
    have hierarchically indexed columns.

    .. versionchanged:: 0.23.0
       Also accept list of column names.

Returns
-------
DataFrame
    Returns reshaped DataFrame.

Raises
------
ValueError:
    When there are any `index`, `columns` combinations with multiple
    values. `DataFrame.pivot_table` when you need to aggregate.

See Also
--------
DataFrame.pivot_table : Generalization of pivot that can handle
    duplicate values for one index/column pair.
DataFrame.unstack : Pivot based on the index values instead of a
    column.

Notes
-----
For finer-tuned control, see hierarchical indexing documentation along
with the related stack/unstack methods.

Examples
--------
>>> df = pd.DataFrame({'foo': ['one', 'one', 'one', 'two', 'two',
...                            'two'],
...                    'bar': ['A', 'B', 'C', 'A', 'B', 'C'],
...                    'baz': [1, 2, 3, 4, 5, 6],
...                    'zoo': ['x', 'y', 'z', 'q', 'w', 't']})
>>> df
    foo   bar  baz  zoo
0   one   A    1    x
1   one   B    2    y
2   one   C    3    z
3   two   A    4    q
4   two   B    5    w
5   two   C    6    t

>>> df.pivot(index='foo', columns='bar', values='baz')
bar  A   B   C
foo
one  1   2   3
two  4   5   6

>>> df.pivot(index='foo', columns='bar')['baz']
bar  A   B   C
foo
one  1   2   3
two  4   5   6

>>> df.pivot(index='foo', columns='bar', values=['baz', 'zoo'])
      baz       zoo
bar   A  B  C   A  B  C
foo
one   1  2  3   x  y  z
two   4  5  6   q  w  t

A ValueError is raised if there are any duplicates.

>>> df = pd.DataFrame({"foo": ['one', 'one', 'two', 'two'],
...                    "bar": ['A', 'A', 'B', 'C'],
...                    "baz": [1, 2, 3, 4]})
>>> df
   foo bar  baz
0  one   A    1
1  one   A    2
2  two   B    3
3  two   C    4

Notice that the first two rows are the same for our `index`
and `columns` arguments.

>>> df.pivot(index='foo', columns='bar', values='baz')
Traceback (most recent call last):
   ...
ValueError: Index contains duplicate entries, cannot reshape
'''
        pass
    def pivot_table(self, values: Optional[Any] = ..., index: Optional[Any] = ..., columns: Optional[Any] = ..., aggfunc: Any = ..., fill_value: Optional[Any] = ..., margins: _bool = ..., dropna: _bool = ..., margins_name: _str = ..., observed: _bool = ...) -> DataFrame:
        '''Create a spreadsheet-style pivot table as a DataFrame.

The levels in the pivot table will be stored in MultiIndex objects
(hierarchical indexes) on the index and columns of the result DataFrame.

Parameters
----------
values : column to aggregate, optional
index : column, Grouper, array, or list of the previous
    If an array is passed, it must be the same length as the data. The
    list can contain any of the other types (except list).
    Keys to group by on the pivot table index.  If an array is passed,
    it is being used as the same manner as column values.
columns : column, Grouper, array, or list of the previous
    If an array is passed, it must be the same length as the data. The
    list can contain any of the other types (except list).
    Keys to group by on the pivot table column.  If an array is passed,
    it is being used as the same manner as column values.
aggfunc : function, list of functions, dict, default numpy.mean
    If list of functions passed, the resulting pivot table will have
    hierarchical columns whose top level are the function names
    (inferred from the function objects themselves)
    If dict is passed, the key is column to aggregate and value
    is function or list of functions.
fill_value : scalar, default None
    Value to replace missing values with.
margins : bool, default False
    Add all row / columns (e.g. for subtotal / grand totals).
dropna : bool, default True
    Do not include columns whose entries are all NaN.
margins_name : str, default 'All'
    Name of the row / column that will contain the totals
    when margins is True.
observed : bool, default False
    This only applies if any of the groupers are Categoricals.
    If True: only show observed values for categorical groupers.
    If False: show all values for categorical groupers.

    .. versionchanged:: 0.25.0

Returns
-------
DataFrame
    An Excel style pivot table.

See Also
--------
DataFrame.pivot : Pivot without aggregation that can handle
    non-numeric data.

Examples
--------
>>> df = pd.DataFrame({"A": ["foo", "foo", "foo", "foo", "foo",
...                          "bar", "bar", "bar", "bar"],
...                    "B": ["one", "one", "one", "two", "two",
...                          "one", "one", "two", "two"],
...                    "C": ["small", "large", "large", "small",
...                          "small", "large", "small", "small",
...                          "large"],
...                    "D": [1, 2, 2, 3, 3, 4, 5, 6, 7],
...                    "E": [2, 4, 5, 5, 6, 6, 8, 9, 9]})
>>> df
     A    B      C  D  E
0  foo  one  small  1  2
1  foo  one  large  2  4
2  foo  one  large  2  5
3  foo  two  small  3  5
4  foo  two  small  3  6
5  bar  one  large  4  6
6  bar  one  small  5  8
7  bar  two  small  6  9
8  bar  two  large  7  9

This first example aggregates values by taking the sum.

>>> table = pd.pivot_table(df, values='D', index=['A', 'B'],
...                     columns=['C'], aggfunc=np.sum)
>>> table
C        large  small
A   B
bar one    4.0    5.0
    two    7.0    6.0
foo one    4.0    1.0
    two    NaN    6.0

We can also fill missing values using the `fill_value` parameter.

>>> table = pd.pivot_table(df, values='D', index=['A', 'B'],
...                     columns=['C'], aggfunc=np.sum, fill_value=0)
>>> table
C        large  small
A   B
bar one      4      5
    two      7      6
foo one      4      1
    two      0      6

The next example aggregates by taking the mean across multiple columns.

>>> table = pd.pivot_table(df, values=['D', 'E'], index=['A', 'C'],
...                     aggfunc={'D': np.mean,
...                              'E': np.mean})
>>> table
                D         E
A   C
bar large  5.500000  7.500000
    small  5.500000  8.500000
foo large  2.000000  4.500000
    small  2.333333  4.333333

We can also calculate multiple types of aggregations for any given
value column.

>>> table = pd.pivot_table(df, values=['D', 'E'], index=['A', 'C'],
...                     aggfunc={'D': np.mean,
...                              'E': [min, max, np.mean]})
>>> table
                D    E
            mean  max      mean  min
A   C
bar large  5.500000  9.0  7.500000  6.0
    small  5.500000  9.0  8.500000  8.0
foo large  2.000000  5.0  4.500000  4.0
    small  2.333333  6.0  4.333333  2.0
'''
        pass
    def plot(self, kind: _str, yerr: DataFrame, **kwargs) -> matplotlib.axes.Axes: ...
    def pop(self, item: _str) -> Series[_DType]: ...
    def pow(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    @overload
    def prod(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def prod(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., **kwargs) -> Series: ...
    def product(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ..., **kwargs) -> DataFrame: ...
    @overload
    def quantile(self, q: float = ..., axis: _AxisType = ..., numeric_only: _bool = ..., interpolation: Literal['linear', 'lower', 'higher', 'midpoint', 'nearest'] = ...) -> Series: ...
    @overload
    def quantile(self, q: List = ..., axis: _AxisType = ..., numeric_only: _bool = ..., interpolation: Literal['linear', 'lower', 'higher', 'midpoint', 'nearest'] = ...) -> DataFrame: ...
    def query(self, expr: _str, inplace: _bool = ..., **kwargs) -> DataFrame: ...
    def radd(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def rank(self, axis: _AxisType = ..., method: Literal['average', 'min', 'max', 'first', 'dense'] = ..., numeric_only: Optional[_bool] = ..., na_option: Literal['keep', 'top', 'bottom'] = ..., ascending: _bool = ..., pct: _bool = ...) -> DataFrame: ...
    def rdiv(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def reindex(self,  labels: Optional[List] = ..., index: Optional[Any] = ..., columns: Optional[Any] = ..., axis: Optional[_AxisType] = ..., method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill', 'nearest']] = ..., copy: _bool = ..., level: Optional[_LevelType] = ..., fill_value: Any = ..., limit: Optional[int] = ..., tolerance: Optional[Any] = ...) -> DataFrame:
        '''Conform DataFrame to new index with optional filling logic.

Places NA/NaN in locations having no value in the previous index. A new object
is produced unless the new index is equivalent to the current one and
``copy=False``.

Parameters
----------
labels : array-like, optional
            New labels / index to conform the axis specified by 'axis' to.
index, columns : array-like, optional
    New labels / index to conform to, should be specified using
    keywords. Preferably an Index object to avoid duplicating data.
axis : int or str, optional
            Axis to target. Can be either the axis name ('index', 'columns')
            or number (0, 1).
method : {None, 'backfill'/'bfill', 'pad'/'ffill', 'nearest'}
    Method to use for filling holes in reindexed DataFrame.
    Please note: this is only applicable to DataFrames/Series with a
    monotonically increasing/decreasing index.

    * None (default): don't fill gaps
    * pad / ffill: Propagate last valid observation forward to next
      valid.
    * backfill / bfill: Use next valid observation to fill gap.
    * nearest: Use nearest valid observations to fill gap.

copy : bool, default True
    Return a new object, even if the passed indexes are the same.
level : int or name
    Broadcast across a level, matching Index values on the
    passed MultiIndex level.
fill_value : scalar, default np.NaN
    Value to use for missing values. Defaults to NaN, but can be any
    "compatible" value.
limit : int, default None
    Maximum number of consecutive elements to forward or backward fill.
tolerance : optional
    Maximum distance between original and new labels for inexact
    matches. The values of the index at the matching locations most
    satisfy the equation ``abs(index[indexer] - target) <= tolerance``.

    Tolerance may be a scalar value, which applies the same tolerance
    to all values, or list-like, which applies variable tolerance per
    element. List-like includes list, tuple, array, Series, and must be
    the same size as the index and its dtype must exactly match the
    index's type.

    .. versionadded:: 0.21.0 (list-like tolerance)

Returns
-------
DataFrame with changed index.

See Also
--------
DataFrame.set_index : Set row labels.
DataFrame.reset_index : Remove row labels or move them to new columns.
DataFrame.reindex_like : Change to same indices as other DataFrame.

Examples
--------

``DataFrame.reindex`` supports two calling conventions

* ``(index=index_labels, columns=column_labels, ...)``
* ``(labels, axis={'index', 'columns'}, ...)``

We *highly* recommend using keyword arguments to clarify your
intent.

Create a dataframe with some fictional data.

>>> index = ['Firefox', 'Chrome', 'Safari', 'IE10', 'Konqueror']
>>> df = pd.DataFrame({'http_status': [200, 200, 404, 404, 301],
...                   'response_time': [0.04, 0.02, 0.07, 0.08, 1.0]},
...                   index=index)
>>> df
           http_status  response_time
Firefox            200           0.04
Chrome             200           0.02
Safari             404           0.07
IE10               404           0.08
Konqueror          301           1.00

Create a new index and reindex the dataframe. By default
values in the new index that do not have corresponding
records in the dataframe are assigned ``NaN``.

>>> new_index = ['Safari', 'Iceweasel', 'Comodo Dragon', 'IE10',
...              'Chrome']
>>> df.reindex(new_index)
               http_status  response_time
Safari               404.0           0.07
Iceweasel              NaN            NaN
Comodo Dragon          NaN            NaN
IE10                 404.0           0.08
Chrome               200.0           0.02

We can fill in the missing values by passing a value to
the keyword ``fill_value``. Because the index is not monotonically
increasing or decreasing, we cannot use arguments to the keyword
``method`` to fill the ``NaN`` values.

>>> df.reindex(new_index, fill_value=0)
               http_status  response_time
Safari                 404           0.07
Iceweasel                0           0.00
Comodo Dragon            0           0.00
IE10                   404           0.08
Chrome                 200           0.02

>>> df.reindex(new_index, fill_value='missing')
              http_status response_time
Safari                404          0.07
Iceweasel         missing       missing
Comodo Dragon     missing       missing
IE10                  404          0.08
Chrome                200          0.02

We can also reindex the columns.

>>> df.reindex(columns=['http_status', 'user_agent'])
           http_status  user_agent
Firefox            200         NaN
Chrome             200         NaN
Safari             404         NaN
IE10               404         NaN
Konqueror          301         NaN

Or we can use "axis-style" keyword arguments

>>> df.reindex(['http_status', 'user_agent'], axis="columns")
           http_status  user_agent
Firefox            200         NaN
Chrome             200         NaN
Safari             404         NaN
IE10               404         NaN
Konqueror          301         NaN

To further illustrate the filling functionality in
``reindex``, we will create a dataframe with a
monotonically increasing index (for example, a sequence
of dates).

>>> date_index = pd.date_range('1/1/2010', periods=6, freq='D')
>>> df2 = pd.DataFrame({"prices": [100, 101, np.nan, 100, 89, 88]},
...                    index=date_index)
>>> df2
            prices
2010-01-01   100.0
2010-01-02   101.0
2010-01-03     NaN
2010-01-04   100.0
2010-01-05    89.0
2010-01-06    88.0

Suppose we decide to expand the dataframe to cover a wider
date range.

>>> date_index2 = pd.date_range('12/29/2009', periods=10, freq='D')
>>> df2.reindex(date_index2)
            prices
2009-12-29     NaN
2009-12-30     NaN
2009-12-31     NaN
2010-01-01   100.0
2010-01-02   101.0
2010-01-03     NaN
2010-01-04   100.0
2010-01-05    89.0
2010-01-06    88.0
2010-01-07     NaN

The index entries that did not have a value in the original data frame
(for example, '2009-12-29') are by default filled with ``NaN``.
If desired, we can fill in the missing values using one of several
options.

For example, to back-propagate the last valid value to fill the ``NaN``
values, pass ``bfill`` as an argument to the ``method`` keyword.

>>> df2.reindex(date_index2, method='bfill')
            prices
2009-12-29   100.0
2009-12-30   100.0
2009-12-31   100.0
2010-01-01   100.0
2010-01-02   101.0
2010-01-03     NaN
2010-01-04   100.0
2010-01-05    89.0
2010-01-06    88.0
2010-01-07     NaN

Please note that the ``NaN`` value present in the original dataframe
(at index value 2010-01-03) will not be filled by any of the
value propagation schemes. This is because filling while reindexing
does not look at dataframe values, but only compares the original and
desired indexes. If you do want to fill in the ``NaN`` values present
in the original dataframe, use the ``fillna()`` method.

See the :ref:`user guide <basics.reindexing>` for more.
        '''
        pass
    def reindex_like(self, other: DataFrame, method: Optional[Literal['backfill', 'bfill', 'pad', 'ffill', 'nearest']] = ..., copy: _bool = ..., limit: Optional[int] = ..., tolerance: Optional[Any] = ...) -> DataFrame: ...
    # looks like rename is missing an index arg?
    @overload
    def rename(self, mapper: Optional[Callable], axis: Optional[_AxisType] = ..., copy: _bool = ..., inplace: _bool = ..., level: Optional[_LevelType] = ..., errors: Literal['ignore', 'raise'] = ...) -> DataFrame: ...
    @overload
    def rename(self, columns: Optional[Dict[_str, _str]], axis: Optional[_AxisType] = ..., copy: _bool = ..., inplace: _bool = ..., level: Optional[_LevelType] = ..., errors: Literal['ignore', 'raise'] = ...) -> DataFrame: ...
    @overload
    def rename_axis(self, mapper: Optional[Any] = ..., index: Optional[_IndexType] = ..., columns: Optional[Any] = ..., axis: Optional[_AxisType] = ..., copy: _bool = ..., *, inplace: Literal[True]) -> None: ...
    @overload
    def rename_axis(self, mapper: Optional[Any] = ..., index: Optional[_IndexType] = ..., columns: Optional[Any] = ..., axis: Optional[_AxisType] = ..., copy: _bool = ..., inplace: Optional[Literal[False]] = ...) -> DataFrame: ...
    def reorder_levels(self, order: List, axis: _AxisType = ...) -> DataFrame: ...
    @overload
    def replace(self, to_replace: Optional[Any] =  ..., value: Optional[Any] = ..., limit: Optional[int] = ..., regex: Any = ..., method: _str = ..., *, inplace: Literal[True]) -> None:
        '''Replace values given in `to_replace` with `value`.

Values of the DataFrame are replaced with other values dynamically.
This differs from updating with ``.loc`` or ``.iloc``, which require
you to specify a location to update with some value.

Parameters
----------
to_replace : str, regex, list, dict, Series, int, float, or None
    How to find the values that will be replaced.

    * numeric, str or regex:

        - numeric: numeric values equal to `to_replace` will be
          replaced with `value`
        - str: string exactly matching `to_replace` will be replaced
          with `value`
        - regex: regexs matching `to_replace` will be replaced with
          `value`

    * list of str, regex, or numeric:

        - First, if `to_replace` and `value` are both lists, they
          **must** be the same length.
        - Second, if ``regex=True`` then all of the strings in **both**
          lists will be interpreted as regexs otherwise they will match
          directly. This doesn't matter much for `value` since there
          are only a few possible substitution regexes you can use.
        - str, regex and numeric rules apply as above.

    * dict:

        - Dicts can be used to specify different replacement values
          for different existing values. For example,
          ``{'a': 'b', 'y': 'z'}`` replaces the value 'a' with 'b' and
          'y' with 'z'. To use a dict in this way the `value`
          parameter should be `None`.
        - For a DataFrame a dict can specify that different values
          should be replaced in different columns. For example,
          ``{'a': 1, 'b': 'z'}`` looks for the value 1 in column 'a'
          and the value 'z' in column 'b' and replaces these values
          with whatever is specified in `value`. The `value` parameter
          should not be ``None`` in this case. You can treat this as a
          special case of passing two lists except that you are
          specifying the column to search in.
        - For a DataFrame nested dictionaries, e.g.,
          ``{'a': {'b': np.nan}}``, are read as follows: look in column
          'a' for the value 'b' and replace it with NaN. The `value`
          parameter should be ``None`` to use a nested dict in this
          way. You can nest regular expressions as well. Note that
          column names (the top-level dictionary keys in a nested
          dictionary) **cannot** be regular expressions.

    * None:

        - This means that the `regex` argument must be a string,
          compiled regular expression, or list, dict, ndarray or
          Series of such elements. If `value` is also ``None`` then
          this **must** be a nested dictionary or Series.

    See the examples section for examples of each of these.
value : scalar, dict, list, str, regex, default None
    Value to replace any values matching `to_replace` with.
    For a DataFrame a dict of values can be used to specify which
    value to use for each column (columns not in the dict will not be
    filled). Regular expressions, strings and lists or dicts of such
    objects are also allowed.
inplace : bool, default False
    If True, in place. Note: this will modify any
    other views on this object (e.g. a column from a DataFrame).
    Returns the caller if this is True.
limit : int, default None
    Maximum size gap to forward or backward fill.
regex : bool or same types as `to_replace`, default False
    Whether to interpret `to_replace` and/or `value` as regular
    expressions. If this is ``True`` then `to_replace` *must* be a
    string. Alternatively, this could be a regular expression or a
    list, dict, or array of regular expressions in which case
    `to_replace` must be ``None``.
method : {'pad', 'ffill', 'bfill', `None`}
    The method to use when for replacement, when `to_replace` is a
    scalar, list or tuple and `value` is ``None``.

    .. versionchanged:: 0.23.0
        Added to DataFrame.

Returns
-------
DataFrame
    Object after replacement.

Raises
------
AssertionError
    * If `regex` is not a ``bool`` and `to_replace` is not
      ``None``.
TypeError
    * If `to_replace` is a ``dict`` and `value` is not a ``list``,
      ``dict``, ``ndarray``, or ``Series``
    * If `to_replace` is ``None`` and `regex` is not compilable
      into a regular expression or is a list, dict, ndarray, or
      Series.
    * When replacing multiple ``bool`` or ``datetime64`` objects and
      the arguments to `to_replace` does not match the type of the
      value being replaced
ValueError
    * If a ``list`` or an ``ndarray`` is passed to `to_replace` and
      `value` but they are not the same length.

See Also
--------
DataFrame.fillna : Fill NA values.
DataFrame.where : Replace values based on boolean condition.
Series.str.replace : Simple string replacement.

Notes
-----
* Regex substitution is performed under the hood with ``re.sub``. The
  rules for substitution for ``re.sub`` are the same.
* Regular expressions will only substitute on strings, meaning you
  cannot provide, for example, a regular expression matching floating
  point numbers and expect the columns in your frame that have a
  numeric dtype to be matched. However, if those floating point
  numbers *are* strings, then you can do this.
* This method has *a lot* of options. You are encouraged to experiment
  and play with this method to gain intuition about how it works.
* When dict is used as the `to_replace` value, it is like
  key(s) in the dict are the to_replace part and
  value(s) in the dict are the value parameter.

Examples
--------

**Scalar `to_replace` and `value`**

>>> s = pd.Series([0, 1, 2, 3, 4])
>>> s.replace(0, 5)
0    5
1    1
2    2
3    3
4    4
dtype: int64

>>> df = pd.DataFrame({'A': [0, 1, 2, 3, 4],
...                    'B': [5, 6, 7, 8, 9],
...                    'C': ['a', 'b', 'c', 'd', 'e']})
>>> df.replace(0, 5)
   A  B  C
0  5  5  a
1  1  6  b
2  2  7  c
3  3  8  d
4  4  9  e

**List-like `to_replace`**

>>> df.replace([0, 1, 2, 3], 4)
   A  B  C
0  4  5  a
1  4  6  b
2  4  7  c
3  4  8  d
4  4  9  e

>>> df.replace([0, 1, 2, 3], [4, 3, 2, 1])
   A  B  C
0  4  5  a
1  3  6  b
2  2  7  c
3  1  8  d
4  4  9  e

>>> s.replace([1, 2], method='bfill')
0    0
1    3
2    3
3    3
4    4
dtype: int64

**dict-like `to_replace`**

>>> df.replace({0: 10, 1: 100})
     A  B  C
0   10  5  a
1  100  6  b
2    2  7  c
3    3  8  d
4    4  9  e

>>> df.replace({'A': 0, 'B': 5}, 100)
     A    B  C
0  100  100  a
1    1    6  b
2    2    7  c
3    3    8  d
4    4    9  e

>>> df.replace({'A': {0: 100, 4: 400}})
     A  B  C
0  100  5  a
1    1  6  b
2    2  7  c
3    3  8  d
4  400  9  e

**Regular expression `to_replace`**

>>> df = pd.DataFrame({'A': ['bat', 'foo', 'bait'],
...                    'B': ['abc', 'bar', 'xyz']})
>>> df.replace(to_replace=r'^ba.$', value='new', regex=True)
      A    B
0   new  abc
1   foo  new
2  bait  xyz

>>> df.replace({'A': r'^ba.$'}, {'A': 'new'}, regex=True)
      A    B
0   new  abc
1   foo  bar
2  bait  xyz

>>> df.replace(regex=r'^ba.$', value='new')
      A    B
0   new  abc
1   foo  new
2  bait  xyz

>>> df.replace(regex={r'^ba.$': 'new', 'foo': 'xyz'})
      A    B
0   new  abc
1   xyz  new
2  bait  xyz

>>> df.replace(regex=[r'^ba.$', 'foo'], value='new')
      A    B
0   new  abc
1   new  new
2  bait  xyz

Note that when replacing multiple ``bool`` or ``datetime64`` objects,
the data types in the `to_replace` parameter must match the data
type of the value being replaced:

>>> df = pd.DataFrame({'A': [True, False, True],
...                    'B': [False, True, False]})
>>> df.replace({'a string': 'new value', True: False})  # raises
Traceback (most recent call last):
    ...
TypeError: Cannot compare types 'ndarray(dtype=bool)' and 'str'

This raises a ``TypeError`` because one of the ``dict`` keys is not of
the correct type for replacement.

Compare the behavior of ``s.replace({'a': None})`` and
``s.replace('a', None)`` to understand the peculiarities
of the `to_replace` parameter:

>>> s = pd.Series([10, 'a', 'a', 'b', 'a'])

When one uses a dict as the `to_replace` value, it is like the
value(s) in the dict are equal to the `value` parameter.
``s.replace({'a': None})`` is equivalent to
``s.replace(to_replace={'a': None}, value=None, method=None)``:

>>> s.replace({'a': None})
0      10
1    None
2    None
3       b
4    None
dtype: object

When ``value=None`` and `to_replace` is a scalar, list or
tuple, `replace` uses the method parameter (default 'pad') to do the
replacement. So this is why the 'a' values are being replaced by 10
in rows 1 and 2 and 'b' in row 4 in this case.
The command ``s.replace('a', None)`` is actually equivalent to
``s.replace(to_replace='a', value=None, method='pad')``:

>>> s.replace('a', None)
0    10
1    10
2    10
3     b
4     b
dtype: object
'''
        pass
    @overload
    def replace(self, to_replace: Optional[Any] =  ..., value: Optional[Any] = ..., inplace: Optional[Literal[False]] = ..., limit: Optional[int] = ..., regex: Any = ..., method: _str = ...) -> DataFrame: ...
    def resample(self, rule: Any, axis: _AxisType = ..., closed: Optional[_str] = ..., label: Optional[_str] = ..., convention: Literal['start', 'end', 's', 'e'] = ..., kind: Optional[Literal['timestamp', 'period']] = ..., loffset: Optional[Any] = ..., base: int = ..., on: _Optional[str] = ..., level: Optional[_LevelType] = ...) -> Any: ...
    @overload
    def reset_index(self, level: _LevelType = ..., drop: _bool = ..., col_level: Union[int, _str] = ..., col_fill: Hashable = ..., *, inplace: Literal[True]) -> None: ...
    @overload
    def reset_index(self, level: _LevelType = ..., drop: _bool = ..., inplace: Optional[Literal[False]] = ..., col_level: Union[int, _str] = ..., col_fill: Hashable = ...) -> DataFrame: ...
    def rfloordiv(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType ]= ..., fill_value: Optional[Union[float, None]] = ...) -> DataFrame: ...
    def rmod(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def rmul(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def rolling(self, window: Any, min_periods: Optional[int] = ..., center: _bool = ..., win_type: Optional[_str] = ..., on: Optional[_str] = ..., axis: _AxisType = ..., closed: Optional[_str] = ...) -> Any: ...  # For now
    def round(self, decimals: Union[int, Dict, Series[_DType]] = ..., **kwargs) -> DataFrame: ...
    def rpow(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def rsub(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def rtruediv(self, other: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    # sample is missing a weights arg
    @overload
    def sample(self, frac: Optional[float], random_state: Optional[int] = ..., replace: _bool = ..., axis: Optional[_AxisType] = ...) -> DataFrame: ...
    @overload
    def sample(self, n: Optional[int], random_state: Optional[int] = ..., replace: _bool = ..., axis: Optional[_AxisType] = ...) -> DataFrame: ...
    def select_dtypes(self, include: Optional[Union[_str, List[_str]]] = ..., exclude: Optional[Union[_str, List[_str]]] = ...) -> DataFrame: ...
    @overload
    def sem(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def sem(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...
    @overload
    def set_axis(self, labels: List, inplace: Literal[True], axis: _AxisType = ...) -> None: ...
    @overload
    def set_axis(self, labels: List, axis: _AxisType = ..., inplace: Optional[Literal[False]] = ...) -> DataFrame: ...
    @overload
    def set_index(self, keys: List, drop: _bool = ..., append: _bool = ..., verify_integrity: _bool = ..., *, inplace: Literal[True]) -> None: ...
    @overload
    def set_index(self, keys: List, drop: _bool = ..., append: _bool = ..., inplace: Optional[Literal[True]] = ..., verify_integrity: _bool = ...) -> DataFrame: ...
    def shift(self, periods: int = ..., freq: Optional[Any] = ..., axis: _AxisType = ..., fill_value: Optional[Hashable] = ...) -> DataFrame:
        '''Shift index by desired number of periods with an optional time `freq`.

When `freq` is not passed, shift the index without realigning the data.
If `freq` is passed (in this case, the index must be date or datetime,
or it will raise a `NotImplementedError`), the index will be
increased using the periods and the `freq`.

Parameters
----------
periods : int
    Number of periods to shift. Can be positive or negative.
freq : DateOffset, tseries.offsets, timedelta, or str, optional
    Offset to use from the tseries module or time rule (e.g. 'EOM').
    If `freq` is specified then the index values are shifted but the
    data is not realigned. That is, use `freq` if you would like to
    extend the index when shifting and preserve the original data.
axis : {0 or 'index', 1 or 'columns', None}, default None
    Shift direction.
fill_value : object, optional
    The scalar value to use for newly introduced missing values.
    the default depends on the dtype of `self`.
    For numeric data, ``np.nan`` is used.
    For datetime, timedelta, or period data, etc. :attr:`NaT` is used.
    For extension dtypes, ``self.dtype.na_value`` is used.

    .. versionchanged:: 0.24.0

Returns
-------
DataFrame
    Copy of input object, shifted.

See Also
--------
Index.shift : Shift values of Index.
DatetimeIndex.shift : Shift values of DatetimeIndex.
PeriodIndex.shift : Shift values of PeriodIndex.
tshift : Shift the time index, using the index's frequency if
    available.

Examples
--------
>>> df = pd.DataFrame({'Col1': [10, 20, 15, 30, 45],
...                    'Col2': [13, 23, 18, 33, 48],
...                    'Col3': [17, 27, 22, 37, 52]})

>>> df.shift(periods=3)
   Col1  Col2  Col3
0   NaN   NaN   NaN
1   NaN   NaN   NaN
2   NaN   NaN   NaN
3  10.0  13.0  17.0
4  20.0  23.0  27.0

>>> df.shift(periods=1, axis='columns')
   Col1  Col2  Col3
0   NaN  10.0  13.0
1   NaN  20.0  23.0
2   NaN  15.0  18.0
3   NaN  30.0  33.0
4   NaN  45.0  48.0

>>> df.shift(periods=3, fill_value=0)
   Col1  Col2  Col3
0     0     0     0
1     0     0     0
2     0     0     0
3    10    13    17
4    20    23    27
'''
        pass
    @overload
    def skew(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def skew(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool ]= ..., level: None = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...
    def slice_shift(self, periods: int = ..., axis: _AxisType = ...) -> DataFrame: ...
    @overload
    def sort_index(self, axis: _AxisType = ..., level: Optional[_LevelType] = ..., ascending: _bool = ..., kind: Literal['quicksort', 'mergesort', 'heapsort'] = ..., na_position: Literal['first', 'last'] = ..., sort_remaining: _bool = ..., ignore_index: _bool = ..., *, inplace: Literal[True]) -> None:
        '''Sort object by labels (along an axis).

Parameters
----------
axis : {0 or 'index', 1 or 'columns'}, default 0
    The axis along which to sort.  The value 0 identifies the rows,
    and 1 identifies the columns.
level : int or level name or list of ints or list of level names
    If not None, sort on values in specified index level(s).
ascending : bool, default True
    Sort ascending vs. descending.
inplace : bool, default False
    If True, perform operation in-place.
kind : {'quicksort', 'mergesort', 'heapsort'}, default 'quicksort'
    Choice of sorting algorithm. See also ndarray.np.sort for more
    information.  `mergesort` is the only stable algorithm. For
    DataFrames, this option is only applied when sorting on a single
    column or label.
na_position : {'first', 'last'}, default 'last'
    Puts NaNs at the beginning if `first`; `last` puts NaNs at the end.
    Not implemented for MultiIndex.
sort_remaining : bool, default True
    If True and sorting by level and index is multilevel, sort by other
    levels too (in order) after sorting by specified level.
ignore_index : bool, default False
    If True, the resulting axis will be labeled 0, 1, …, n - 1.

    .. versionadded:: 1.0.0

Returns
-------
sorted_obj : DataFrame or None
    DataFrame with sorted index if inplace=False, None otherwise.
'''
        pass
    @overload
    def sort_index(self, axis: _AxisType = ..., level: Optional[_LevelType] = ..., ascending: _bool = ..., inplace: Optional[Literal[False]] = ..., kind: Literal['quicksort', 'mergesort', 'heapsort'] = ..., na_position: Literal['first', 'last'] = ..., sort_remaining: _bool = ..., ignore_index: _bool = ...) -> DataFrame: ...
    @overload
    def sort_values(self, by: List[_str], axis: _AxisType = ..., ascending: _bool = ..., kind: Literal['quicksort', 'mergesort', 'heapsort'] = ..., na_position: Literal['first', 'last'] = ..., ignore_index: _bool = ..., *, inplace: Literal[True]) -> None:
        '''Sort by the values along either axis.

Parameters
----------
        by : str or list of str
            Name or list of names to sort by.

            - if `axis` is 0 or `'index'` then `by` may contain index
              levels and/or column labels.
            - if `axis` is 1 or `'columns'` then `by` may contain column
              levels and/or index labels.

            .. versionchanged:: 0.23.0

               Allow specifying index or column level names.
axis : {0 or 'index', 1 or 'columns'}, default 0
     Axis to be sorted.
ascending : bool or list of bool, default True
     Sort ascending vs. descending. Specify list for multiple sort
     orders.  If this is a list of bools, must match the length of
     the by.
inplace : bool, default False
     If True, perform operation in-place.
kind : {'quicksort', 'mergesort', 'heapsort'}, default 'quicksort'
     Choice of sorting algorithm. See also ndarray.np.sort for more
     information.  `mergesort` is the only stable algorithm. For
     DataFrames, this option is only applied when sorting on a single
     column or label.
na_position : {'first', 'last'}, default 'last'
     Puts NaNs at the beginning if `first`; `last` puts NaNs at the
     end.
ignore_index : bool, default False
     If True, the resulting axis will be labeled 0, 1, …, n - 1.

     .. versionadded:: 1.0.0

Returns
-------
sorted_obj : DataFrame or None
    DataFrame with sorted values if inplace=False, None otherwise.

Examples
--------
>>> df = pd.DataFrame({
...     'col1': ['A', 'A', 'B', np.nan, 'D', 'C'],
...     'col2': [2, 1, 9, 8, 7, 4],
...     'col3': [0, 1, 9, 4, 2, 3],
... })
>>> df
    col1 col2 col3
0   A    2    0
1   A    1    1
2   B    9    9
3   NaN  8    4
4   D    7    2
5   C    4    3

Sort by col1

>>> df.sort_values(by=['col1'])
    col1 col2 col3
0   A    2    0
1   A    1    1
2   B    9    9
5   C    4    3
4   D    7    2
3   NaN  8    4

Sort by multiple columns

>>> df.sort_values(by=['col1', 'col2'])
    col1 col2 col3
1   A    1    1
0   A    2    0
2   B    9    9
5   C    4    3
4   D    7    2
3   NaN  8    4

Sort Descending

>>> df.sort_values(by='col1', ascending=False)
    col1 col2 col3
4   D    7    2
5   C    4    3
2   B    9    9
0   A    2    0
1   A    1    1
3   NaN  8    4

Putting NAs first

>>> df.sort_values(by='col1', ascending=False, na_position='first')
    col1 col2 col3
3   NaN  8    4
4   D    7    2
5   C    4    3
2   B    9    9
0   A    2    0
1   A    1    1
'''
        pass
    @overload
    def sort_values(self, by: List[_str], axis: _AxisType = ..., ascending: _bool = ..., inplace: Optional[Literal[False]] = ..., kind: Literal['quicksort', 'mergesort', 'heapsort'] = ..., na_position: Literal['first', 'last'] = ..., ignore_index: _bool = ...) -> DataFrame: ...
    def squeeze(self, axis: Optional[_AxisType] = ...) -> Any: ...
    def stack(self, level: _LevelType = ..., dropna: _bool = ...) -> Union[DataFrame, Series[_DType]]: ...
    @overload
    def std(self, axis: _AxisType = ..., skipna: _bool = ..., ddof: int = ..., numeric_only: _bool = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def std(self, axis: _AxisType = ..., skipna: _bool = ..., level: None = ..., ddof: int = ..., numeric_only: _bool = ..., **kwargs) -> Series[_DType]: ...
    def sub(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def subtract(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    @overload
    def sum(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def sum(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., numeric_only: Optional[_bool] = ..., min_count: int = ..., **kwargs) -> Series[_DType]: ...
    def swapaxes(self, axis1: _AxisType, axis2: _AxisType, copy: _bool = ...) -> DataFrame: ...
    def swaplevel(self, i: _LevelType = ..., j: _LevelType = ..., axis: _AxisType = ...) -> DataFrame: ...
    def tail(self, n: int = ...) -> DataFrame: ...
    def take(self, indices: List, axis: _AxisType = ..., is_copy: Optional[_bool] = ..., **kwargs) -> DataFrame: ...
    def transform(self, func: Union[List[Callable], Dict[_str, Callable]], axis: _AxisType = ...,) -> DataFrame: ...
    def transpose(self, copy: _bool=...) -> DataFrame: ...
    T = transpose
    def tshift(self, periods: _int=..., freq: Any = ..., axis: _AxisType = ...) -> DataFrame: ...
    def to_clipboard(self, excel: _bool = ..., sep: Optional[_str] = ..., **kwargs) -> None: ...
    @overload
    def to_csv(self, path_or_buf: Optional[_Path_or_Buf], sep: _str = ..., na_rep: _str = ..., float_format: Optional[_str] = ..., columns: Optional[Sequence[Hashable]] = ..., header: Union[_bool, List[_str]] = ..., index: _bool = ..., index_label: Optional[Union[_bool, _str, Sequence[Hashable]]] = ..., mode: _str = ..., encoding: Optional[_str] = ..., compression: Union[_str, Mapping[_str, _str]] = ..., quoting: Optional[int] = ..., quotechar: _str = ..., line_terminator: Optional[_str] = ..., chunksize: Optional[int] = ..., date_format: Optional[_str] = ..., doublequote: _bool = ..., escapechar: Optional[_str] = ..., decimal: _str = ...) -> None: ...
    @overload
    def to_csv(self, sep: _str = ..., na_rep: _str = ..., float_format: Optional[_str] = ..., columns: Optional[Sequence[Hashable]] = ..., header: Union[_bool, List[_str]] = ..., index: _bool = ..., index_label: Optional[[_bool, _str, Sequence[Hashable]]] = ..., mode: _str = ..., encoding: Optional[_str] = ..., compression: Union[_str, Mapping[_str, _str]] = ..., quoting: Optional[int] = ..., quotechar: _str = ..., line_terminator: Optional[_str] = ..., chunksize: Optional[int] = ..., date_format: Optional[_str ]= ..., doublequote: _bool = ..., escapechar: Optional[_str] = ..., decimal: _str = ...) -> _str: ...
    @overload
    def to_dict(self) -> Dict[_str, Any]: ...
    @overload
    def to_dict(self, orient: Literal['dict', 'list', 'series', 'split', 'records', 'index'] = ..., into: Hashable = ...) -> List[Dict[_str, Any]]: ...
    def to_excel(self, excel_writer: Any, sheet_name: _str = ..., na_rep: _str = ..., float_format: Optional[_str] = ..., columns: Optional[Union[_str, Sequence[_str]]] = ..., header: _bool = ..., index: _bool = ..., index_label: Optional[Union[_str, Sequence[_str]]] = ..., startrow: int = ..., startcol: int = ..., engine: Optional[_str] = ..., merge_cells: _bool = ..., encoding: Optional[_str] = ..., inf_rep: _str = ..., verbose: _bool = ..., freeze_panes: Optional[Tuple[int, int]] = ...) -> None: ...
    def to_feather(self, filename: _str) -> None: ...
    def to_hdf(self, path_or_buf: _Path_or_Buf, key: _str, mode: _str = ..., complevel: Optional[int] = ..., complib: Optional[_str] = ..., append: _bool = ..., format: Optional[_str] = ..., index: _bool = ..., min_itemsize: Optional[Union[int, Dict[_str, int]]] = ..., nan_rep: Optional[Any] = ..., dropna: Optional[_bool] = ..., data_columns: Optional[List[_str]] = ..., errors: _str = ..., encoding: _str = ...) -> None: ...
    @overload
    def to_html(self, buf: Optional[_Path_or_Buf], columns: Optional[Sequence[_str]] = ..., col_space: Optional[Union[_str, int]] = ..., header: _bool = ..., index: _bool = ..., na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., justify: Optional[_str] = ..., max_rows: Optional[int] = ..., max_cols: Optional[int] = ..., show_dimensions: _bool = ..., decimal: _str = ..., bold_rows: _bool = ..., classes: Optional[Union[_str, List, Tuple]] = ..., escape: _bool = ..., notebook: _bool = ..., border: Optional[int] = ..., table_id: Optional[_str] = ..., render_links: _bool = ..., encoding: Optional[_str] = ...) -> None: ...
    @overload
    def to_html(self, columns: Optional[Sequence[_str]] = ..., col_space: Optional[Union[_str, int]] = ..., header: _bool = ..., index: _bool = ..., na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., justify: Optional[_str] = ..., max_rows: Optional[int] = ..., max_cols: Optional[int] = ..., show_dimensions: _bool = ..., decimal: _str = ..., bold_rows: _bool = ..., classes: Optional[Union[_str, List, Tuple]] = ..., escape: _bool = ..., notebook: _bool = ..., border: Optional[int] = ..., table_id: Optional[_str] = ..., render_links: _bool = ..., encoding: Optional[_str] = ...) -> _str: ...
    @overload
    def to_json(self, path_or_buf: Optional[_Path_or_Buf], orient: Optional[Literal['split', 'records', 'index', 'columns', 'values', 'table']] = ..., date_format: Optional[Literal['epoch', 'iso']] = ..., double_precision: int = ..., force_ascii: _bool = ..., date_unit: Literal['s', 'ms', 'us', 'ns'] = ..., default_handler: Optional[Callable[[Any], Union[_str, int, float, _bool, List, Dict]]] = ..., lines: _bool = ..., compression: Literal['infer', 'gzip', 'bz2', 'zip', 'xz'] = ..., index: _bool = ..., indent: Optional[int] = ...) -> None: ...
    @overload
    def to_json(self, orient: Optional[Literal['split', 'records', 'index', 'columns', 'values', 'table']] = ..., date_format: Optional[Literal['epoch', 'iso']] = ..., double_precision: int = ..., force_ascii: _bool = ..., date_unit: Literal['s', 'ms', 'us', 'ns'] = ..., default_handler: Optional[Callable[[Any], Union[_str, int, float, _bool, List, Dict]]] = ..., lines: _bool = ..., compression: Literal['infer', 'gzip', 'bz2', 'zip', 'xz'] = ..., index: _bool = ..., indent: Optional[int] = ...) -> _str: ...
    @overload
    def to_latex(self, buf: Optional[_Path_or_Buf], columns: Optional[List[_str]] = ..., col_space: Optional[int] = ..., header: _bool = ..., index: _bool = ..., na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., bold_rows: _bool = ..., column_format: Optional[_str] = ..., longtable: Optional[_bool] = ..., escape: Optional[_bool] = ..., encoding: Optional[_str] = ..., decimal: _str = ..., multicolumn: Optional[_bool] = ..., multicolumn_format: Optional[_str] = ..., multirow: Optional[_bool] = ..., caption: Optional[_str] = ..., label: Optional[_str] = ...) -> None: ...
    @overload
    def to_latex(self, columns: Optional[List[_str]] = ..., col_space: Optional[int] = ..., header: _bool = ..., index: _bool = ..., na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., bold_rows: _bool = ..., column_format: Optional[_str] = ..., longtable: Optional[_bool] = ..., escape: Optional[_bool] = ..., encoding: Optional[_str] = ..., decimal: _str = ..., multicolumn: Optional[_bool] = ..., multicolumn_format: Optional[_str] = ..., multirow: Optional[_bool] = ..., caption: Optional[_str] = ..., label: Optional[_str] = ...) -> _str: ...
    @overload
    def to_markdown(self, buf: Optional[_Path_or_Buf], mode: Optional[_str] = ..., **kwargs) -> None:
        '''Print DataFrame in Markdown-friendly format.

.. versionadded:: 1.0.0

Parameters
----------
buf : writable buffer, defaults to sys.stdout
    Where to send the output. By default, the output is printed to
    sys.stdout. Pass a writable buffer if you need to further process
    the output.
mode : str, optional
    Mode in which file is opened.
**kwargs
    These parameters will be passed to `tabulate`.

Returns
-------
str
    DataFrame in Markdown-friendly format.

        Examples
        --------
        >>> df = pd.DataFrame(
        ...     data={"animal_1": ["elk", "pig"], "animal_2": ["dog", "quetzal"]}
        ... )
        >>> print(df.to_markdown())
        |    | animal_1   | animal_2   |
        |---:|:-----------|:-----------|
        |  0 | elk        | dog        |
        |  1 | pig        | quetzal    |
'''
        pass
    @overload
    def to_markdown(self, mode: Optional[_str] = ..., **kwargs) -> _str: ...
    @overload
    def to_numpy(self) -> _np.ndarray: ...
    @overload
    def to_numpy(self, dtype: Optional[Type[_DTypeNp]]) -> _np.ndarray[_DTypeNp]: ...
    def to_parquet(self, path: _str, engine: Literal['auto', 'pyarrow', 'fastparquet'] = ..., compression: Literal['snappy', 'gzip', 'brotli'] = ..., index: Optional[_bool] = ..., partition_cols: Optional[List] = ..., **kwargs) -> None: ...
    def to_period(self, freq: Optional[_str] = ..., axis: _AxisType = ..., copy: _bool = ...) -> DataFrame: ...
    def to_pickle(self, path: _str, compression: Literal['infer', 'gzip', 'bz2', 'zip', 'xz'] = ..., protocol: int = ...) -> None: ...
    def to_records(self, index: _bool = ..., column_dtypes: Optional[Union[_str, Dict]] = ..., index_dtypes: Optional[Union[_str, Dict]] = ...) -> Any: ...
    def to_sql(self, name: _str, con: Any, schema: Optional[_str] = ..., if_exists: _str = ..., index: _bool = ..., index_label: Optional[Union[_str, Sequence[_str]]] = ..., chunksize: Optional[int] = ..., dtype: Optional[Union[Dict, _Scalar]] = ..., method: Optional[Union[_str, Callable]] = ...) -> None: ...
    def to_stata(self, path: _Path_or_Buf, convert_dates: Optional[Dict] = ..., write_index: _bool = ..., byteorder: Optional[Literal['<', '>', 'little', 'big']] = ..., time_stamp: Optional[Any] = ..., data_label: Optional[_str] = ..., variable_labels: Optional[Dict] = ..., version: int = ..., convert_strl: Optional[List[_str]] = ...) -> None: ...
    @overload
    def to_string(self, buf: Optional[_Path_or_Buf], columns: Optional[Sequence[_str]] = ..., col_space: Optional[int] = ..., header: Union[_bool, Sequence[_str]] = ..., index: _bool = ..., na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., justify: Optional[_str] = ..., max_rows: Optional[int] = ..., min_rows: Optional[int] = ..., max_cols: Optional[int] = ..., show_dimensions: _bool = ..., decimal: _str = ..., line_width: Optional[int] = ..., max_colwidth: Optional[int] = ..., encoding: Optional[_str] = ...) -> None: ...
    @overload
    def to_string(self, columns: Optional[Sequence[_str]] = ..., col_space: Optional[int] = ..., header: Union[_bool, Sequence[_str]] = ..., index: _bool = ..., na_rep: _str = ..., formatters: Optional[Any] = ..., float_format: Optional[Any] = ..., sparsify: Optional[_bool] = ..., index_names: _bool = ..., justify: Optional[_str] = ..., max_rows: Optional[int] = ..., min_rows: Optional[int] = ..., max_cols: Optional[int] = ..., show_dimensions: _bool = ..., decimal: _str = ..., line_width: Optional[int] = ..., max_colwidth: Optional[int] = ..., encoding: Optional[_str] = ...) -> _str: ...
    def to_timestamp(self, freq: Optional[Any] = ..., how: Literal['start', 'end', 's', 'e'] = ..., axis: _AxisType = ..., copy: _bool = ...) -> DataFrame: ...
    def to_xarray(self) -> Any: ...
    def transform(self, func: Callable, axis: _AxisType = ..., *args, **kwargs) -> DataFrame:
        '''Call ``func`` on self producing a DataFrame with transformed values.

Produced DataFrame will have same axis length as self.

Parameters
----------
func : function, str, list or dict
    Function to use for transforming the data. If a function, must either
    work when passed a DataFrame or when passed to DataFrame.apply.

    Accepted combinations are:

    - function
    - string function name
    - list of functions and/or function names, e.g. ``[np.exp. 'sqrt']``
    - dict of axis labels -> functions, function names or list of such.
axis : {0 or 'index', 1 or 'columns'}, default 0
    If 0 or 'index': apply function to each column.
    If 1 or 'columns': apply function to each row.
*args
    Positional arguments to pass to `func`.
**kwargs
    Keyword arguments to pass to `func`.

Returns
-------
DataFrame
    A DataFrame that must have the same length as self.

Raises
------
ValueError : If the returned DataFrame has a different length than self.

See Also
--------
DataFrame.agg : Only perform aggregating type operations.
DataFrame.apply : Invoke function on a DataFrame.

Examples
--------
>>> df = pd.DataFrame({'A': range(3), 'B': range(1, 4)})
>>> df
   A  B
0  0  1
1  1  2
2  2  3
>>> df.transform(lambda x: x + 1)
   A  B
0  1  2
1  2  3
2  3  4

Even though the resulting DataFrame must have the same length as the
input DataFrame, it is possible to provide several input functions:

>>> s = pd.Series(range(3))
>>> s
0    0
1    1
2    2
dtype: int64
>>> s.transform([np.sqrt, np.exp])
       sqrt        exp
0  0.000000   1.000000
1  1.000000   2.718282
2  1.414214   7.389056
'''
        pass
    def truediv(self, other: Union[num, _ListLike, DataFrame], axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., fill_value: Optional[float] = ...) -> DataFrame: ...
    def truncate(self, before: Optional[Union[datetime.date, _str, int]] = ..., after: Optional[Union[datetime.date, _str, int]] = ..., axis: Optional[_AxisType] = ..., copy: _bool = ...) -> DataFrame: ...
    # def tshift
    def tz_convert(self, tz: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., copy: _bool = ...)  -> DataFrame: ...
    def tz_localize(self, tz: Any, axis: _AxisType = ..., level: Optional[_LevelType] = ..., copy: _bool = ..., ambiguous: Any = ..., nonexistent: _str = ...) -> DataFrame: ...
    def unique(self) -> DataFrame: ...
    def unstack(self, level: _LevelType = ..., fill_value: Optional[Union[int, _srt, Dict]] = ...) -> Union[DataFrame, Series[_DType]]: ...
    def update(self, other: Union[DataFrame, Series[_DType]], join: Literal['left'] = ..., overwrite: _bool = ..., filter_func: Optional[Callable] = ..., errors: Literal['raise', 'ignore'] = ...) -> None: ...
    @overload
    def var(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame: ...
    @overload
    def var(self, axis: Optional[_AxisType] = ..., skipna: Optional[_bool] = ..., level: None = ..., ddof: int = ..., numeric_only: Optional[_bool] = ..., **kwargs) -> Series[_DType]: ...   
    def where(self, cond: Union[Series[_DType], DataFrame, _np.ndarray], other: Any = ..., inplace: _bool = ..., axis: Optional[_AxisType] = ..., level: Optional[_LevelType] = ..., errors: _str =..., try_cast: _bool =...) -> DataFrame: ...
    def xs(self, key: Union[_str, Tuple[_str]], axis: _AxisType = ..., level: Optional[_LevelType] = ..., drop_level: _bool = ...) -> DataFrame: ...


_IndexType = Union[slice, _np_ndarray_int64, Index[int], List[int], Series[int]]
_MaskType = Union[Series[bool], _np_ndarray_bool, List[bool]]


class _iLocIndexerFrame:
    @overload
    def __getitem__(self, idx: Tuple[int, int]) -> float: ...
    @overload
    def __getitem__(self, idx: Union[_IndexType, slice, Tuple[_IndexType, _IndexType]]) -> DataFrame: ...
    @overload
    def __getitem__(self, idx: Union[int, Tuple[_IndexType, int, Tuple[int, _IndexType]]]) -> Series[_DType]: ...

    def __setitem__(self, idx: Union[int, _IndexType, Tuple[int, int], Tuple[_IndexType, int], Tuple[_IndexType, _IndexType], Tuple[int, _IndexType]], value: Union[float, Series[_DType], DataFrame]) -> None: ...


class _iLocIndexerSeries(Generic[_DType]):
    # get item
    @overload
    def __getitem__(self, idx: int) -> _DType: ...
    @overload
    def __getitem__(self, idx: _IndexType) -> Series[_DType]: ...
    # set item
    @overload
    def __setitem__(self, idx: int, value: _DType) -> None: ...
    @overload
    def __setitem__(self, idx: _IndexType, value: Union[_DType, Series[_DType]]) -> None: ...


class _LocIndexerFrame:
    @overload
    def __getitem__(self, idx: Union[int, slice, _MaskType],) -> DataFrame: ...
    @overload
    def __getitem__(self, idx: _StrLike,) -> Series[_DType]: ...
    @overload
    def __getitem__(self, idx: Tuple[_StrLike, _StrLike],) -> float: ...
    @overload
    def __getitem__(self, idx: Tuple[Union[_MaskType, List[str]], Union[_MaskType, List[str]]],) -> DataFrame: ...

    def __setitem__(self, idx: Union[_MaskType, _StrLike, Tuple[Union[_MaskType, List[str]], Union[_MaskType, List[str]]]], value: Union[float, _np.ndarray, Series[_DType], DataFrame],) -> None: ...


class _LocIndexerSeries(Generic[_DType]):
    @overload
    def __getitem__(self, idx: _MaskType,) -> Series[_DType]: ...
    @overload
    def __getitem__(self, idx: Union[int, str],) -> _DType: ...
    @overload
    def __getitem__(self, idx: List[str],) -> Series[_DType]: ...
    
    @overload
    def __setitem__(self, idx: _MaskType, value: Union[_DType, _np.ndarray, Series[_DType]],) -> None: ...
    @overload
    def __setitem__(self, idx: str, value: _DType,) -> None: ...
    @overload
    def __setitem__(self, idx: List[str], value: Union[_DType, _np.ndarray, Series[_DType]],) -> None: ...


# Incomplete: see https://pandas.pydata.org/pandas-docs/stable/reference/groupby.html
class GroupBy:

    def __iter__(self) -> Generator[Tuple[str, Any]]: ...

    @property
    def groups(self) -> Dict[str, str]: ...
    @property
    def indices(self) -> Dict[str, Index]: ...

    def agg(self, func: Optional[Callable] = ..., *args, **kwargs): ...
    def aggregate(self, func: Optional[Callable] = ..., *args, **kwargs): ...
    def all(self, skipna: bool = ...) -> bool:
        '''Return True if all values in the group are truthful, else False.

Parameters
----------
skipna : bool, default True
    Flag to ignore nan values during truth testing.

Returns
-------
bool

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def any(self, skipna: bool = ...) -> bool:
        '''Return True if any value in the group is truthful, else False.

Parameters
----------
skipna : bool, default True
    Flag to ignore nan values during truth testing.

Returns
-------
bool

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def apply(self, func: Callable, *args, **kwargs) -> Union[Series, DataFrame]: ...
    def bfill(self, limit: Optional[int] = ...) -> Union[Series, DataFrame]:
        '''Backward fill the values.

Parameters
----------
limit : int, optional
    Limit of how many values to fill.

Returns
-------
Series or DataFrame
    Object with missing values filled.

See Also
--------
Series.backfill
DataFrame.backfill
Series.fillna
DataFrame.fillna
'''
        pass
    def count(self) -> Union[Series, DataFrame]:
        '''Compute count of group, excluding missing values.

Returns
-------
Series or DataFrame
    Count of values within each group.

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def cumcount(self, ascending: bool = ...) -> Series:
        '''Number each item in each group from 0 to the length of that group - 1.

Essentially this is equivalent to

>>> self.apply(lambda x: pd.Series(np.arange(len(x)), x.index))

Parameters
----------
ascending : bool, default True
    If False, number in reverse, from length of group - 1 to 0.

Returns
-------
Series
    Sequence number of each element within each group.

See Also
--------
.ngroup : Number the groups themselves.

Examples
--------

>>> df = pd.DataFrame([['a'], ['a'], ['a'], ['b'], ['b'], ['a']],
...                   columns=['A'])
>>> df
    A
0  a
1  a
2  a
3  b
4  b
5  a
>>> df.groupby('A').cumcount()
0    0
1    1
2    2
3    0
4    1
5    3
dtype: int64
>>> df.groupby('A').cumcount(ascending=False)
0    3
1    2
2    1
3    1
4    0
5    0
dtype: int64
'''
        pass
    def cummax(self, axis: _AxisType = ..., **kwargs) -> Union[Series, DataFrame]:
        '''Cumulative max for each group.

Returns
-------
Series or DataFrame

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def cummin(self, axis: _AxisType = ..., **kwargs) -> Union[Series, DataFrame]:
        '''Cumulative min for each group.

Returns
-------
Series or DataFrame

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def cumprod(self, axis: _AxisType = ..., **kwargs) -> Union[Series, DataFrame]:
        '''Cumulative product for each group.

Returns
-------
Series or DataFrame

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def cumsum(self, axis: _AxisType = ..., **kwargs) -> Union[Series, DataFrame]:
        '''Cumulative sum for each group.

Returns
-------
Series or DataFrame

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def describe(self, **kwargs) -> Union[Series, DataFrame]:
        '''Generate descriptive statistics.

Descriptive statistics include those that summarize the central
tendency, dispersion and shape of a
dataset's distribution, excluding ``NaN`` values.

Analyzes both numeric and object series, as well
as ``DataFrame`` column sets of mixed data types. The output
will vary depending on what is provided. Refer to the notes
below for more detail.

Parameters
----------
percentiles : list-like of numbers, optional
    The percentiles to include in the output. All should
    fall between 0 and 1. The default is
    ``[.25, .5, .75]``, which returns the 25th, 50th, and
    75th percentiles.
include : 'all', list-like of dtypes or None (default), optional
    A white list of data types to include in the result. Ignored
    for ``Series``. Here are the options:

    - 'all' : All columns of the input will be included in the output.
    - A list-like of dtypes : Limits the results to the
      provided data types.
      To limit the result to numeric types submit
      ``numpy.number``. To limit it instead to object columns submit
      the ``numpy.object`` data type. Strings
      can also be used in the style of
      ``select_dtypes`` (e.g. ``df.describe(include=['O'])``). To
      select pandas categorical columns, use ``'category'``
    - None (default) : The result will include all numeric columns.
exclude : list-like of dtypes or None (default), optional,
    A black list of data types to omit from the result. Ignored
    for ``Series``. Here are the options:

    - A list-like of dtypes : Excludes the provided data types
      from the result. To exclude numeric types submit
      ``numpy.number``. To exclude object columns submit the data
      type ``numpy.object``. Strings can also be used in the style of
      ``select_dtypes`` (e.g. ``df.describe(include=['O'])``). To
      exclude pandas categorical columns, use ``'category'``
    - None (default) : The result will exclude nothing.

Returns
-------
Series or DataFrame
    Summary statistics of the Series or Dataframe provided.

See Also
--------
DataFrame.count: Count number of non-NA/null observations.
DataFrame.max: Maximum of the values in the object.
DataFrame.min: Minimum of the values in the object.
DataFrame.mean: Mean of the values.
DataFrame.std: Standard deviation of the observations.
DataFrame.select_dtypes: Subset of a DataFrame including/excluding
    columns based on their dtype.

Notes
-----
For numeric data, the result's index will include ``count``,
``mean``, ``std``, ``min``, ``max`` as well as lower, ``50`` and
upper percentiles. By default the lower percentile is ``25`` and the
upper percentile is ``75``. The ``50`` percentile is the
same as the median.

For object data (e.g. strings or timestamps), the result's index
will include ``count``, ``unique``, ``top``, and ``freq``. The ``top``
is the most common value. The ``freq`` is the most common value's
frequency. Timestamps also include the ``first`` and ``last`` items.

If multiple object values have the highest count, then the
``count`` and ``top`` results will be arbitrarily chosen from
among those with the highest count.

For mixed data types provided via a ``DataFrame``, the default is to
return only an analysis of numeric columns. If the dataframe consists
only of object and categorical data without any numeric columns, the
default is to return an analysis of both the object and categorical
columns. If ``include='all'`` is provided as an option, the result
will include a union of attributes of each type.

The `include` and `exclude` parameters can be used to limit
which columns in a ``DataFrame`` are analyzed for the output.
The parameters are ignored when analyzing a ``Series``.

Examples
--------
Describing a numeric ``Series``.

>>> s = pd.Series([1, 2, 3])
>>> s.describe()
count    3.0
mean     2.0
std      1.0
min      1.0
25%      1.5
50%      2.0
75%      2.5
max      3.0
dtype: float64

Describing a categorical ``Series``.

>>> s = pd.Series(['a', 'a', 'b', 'c'])
>>> s.describe()
count     4
unique    3
top       a
freq      2
dtype: object

Describing a timestamp ``Series``.

>>> s = pd.Series([
...   np.datetime64("2000-01-01"),
...   np.datetime64("2010-01-01"),
...   np.datetime64("2010-01-01")
... ])
>>> s.describe()
count                       3
unique                      2
top       2010-01-01 00:00:00
freq                        2
first     2000-01-01 00:00:00
last      2010-01-01 00:00:00
dtype: object

Describing a ``DataFrame``. By default only numeric fields
are returned.

>>> df = pd.DataFrame({'categorical': pd.Categorical(['d','e','f']),
...                    'numeric': [1, 2, 3],
...                    'object': ['a', 'b', 'c']
...                   })
>>> df.describe()
       numeric
count      3.0
mean       2.0
std        1.0
min        1.0
25%        1.5
50%        2.0
75%        2.5
max        3.0

Describing all columns of a ``DataFrame`` regardless of data type.

>>> df.describe(include='all')
        categorical  numeric object
count            3      3.0      3
unique           3      NaN      3
top              f      NaN      c
freq             1      NaN      1
mean           NaN      2.0    NaN
std            NaN      1.0    NaN
min            NaN      1.0    NaN
25%            NaN      1.5    NaN
50%            NaN      2.0    NaN
75%            NaN      2.5    NaN
max            NaN      3.0    NaN

Describing a column from a ``DataFrame`` by accessing it as
an attribute.

>>> df.numeric.describe()
count    3.0
mean     2.0
std      1.0
min      1.0
25%      1.5
50%      2.0
75%      2.5
max      3.0
Name: numeric, dtype: float64

Including only numeric columns in a ``DataFrame`` description.

>>> df.describe(include=[np.number])
       numeric
count      3.0
mean       2.0
std        1.0
min        1.0
25%        1.5
50%        2.0
75%        2.5
max        3.0

Including only string columns in a ``DataFrame`` description.

>>> df.describe(include=[np.object])
       object
count       3
unique      3
top         c
freq        1

Including only categorical columns from a ``DataFrame`` description.

>>> df.describe(include=['category'])
       categorical
count            3
unique           3
top              f
freq             1

Excluding numeric columns from a ``DataFrame`` description.

>>> df.describe(exclude=[np.number])
       categorical object
count            3      3
unique           3      3
top              f      c
freq             1      1

Excluding object columns from a ``DataFrame`` description.

>>> df.describe(exclude=[np.object])
       categorical  numeric
count            3      3.0
unique           3      NaN
top              f      NaN
freq             1      NaN
mean           NaN      2.0
std            NaN      1.0
min            NaN      1.0
25%            NaN      1.5
50%            NaN      2.0
75%            NaN      2.5
max            NaN      3.0
'''
        pass
    def ffill(self, limit: Optional[int] = ...) -> Union[Series, DataFrame]: ...
    def first(self, **kwargs) -> Union[Series, DataFrame]: ...
    def get_group(self, name: Any, obj: Optional[DataFrame] = ...) -> DataFrame:...
    def head(self, n: int = ...) -> Union[Series, DataFrame]:
        '''Return first n rows of each group.

Similar to ``.apply(lambda x: x.head(n))``, but it returns a subset of rows
from the original DataFrame with original index and order preserved
(``as_index`` flag is ignored).

Does not work for negative values of `n`.

Returns
-------
Series or DataFrame
        
See Also
--------
Series.groupby
DataFrame.groupby

Examples
--------

>>> df = pd.DataFrame([[1, 2], [1, 4], [5, 6]],
...                   columns=['A', 'B'])
>>> df.groupby('A').head(1)
    A  B
0  1  2
2  5  6
>>> df.groupby('A').head(-1)
Empty DataFrame
Columns: [A, B]
Index: []
'''
        pass
    def last(self, **kwargs) -> Union[Series, DataFrame]: ...
    def max(self, **kwargs) -> Union[Series, DataFrame]: ...
    def mean(self, **kwargs) -> Union[Series, DataFrame]:
        '''Compute mean of groups, excluding missing values.

Returns
-------
pandas.Series or pandas.DataFrame
        
See Also
--------
Series.groupby
DataFrame.groupby

Examples
--------
>>> df = pd.DataFrame({'A': [1, 1, 2, 1, 2],
...                    'B': [np.nan, 2, 3, 4, 5],
...                    'C': [1, 2, 1, 1, 2]}, columns=['A', 'B', 'C'])

Groupby one column and return the mean of the remaining columns in
each group.

>>> df.groupby('A').mean()
        B         C
A
1  3.0  1.333333
2  4.0  1.500000

Groupby two columns and return the mean of the remaining column.

>>> df.groupby(['A', 'B']).mean()
        C
A B
1 2.0  2
    4.0  1
2 3.0  1
    5.0  2

Groupby one column and return the mean of only particular column in
the group.

>>> df.groupby('A')['B'].mean()
A
1    3.0
2    4.0
Name: B, dtype: float64
'''
        pass
    def median(self, **kwargs) -> Union[Series, DataFrame]:
        '''Compute median of groups, excluding missing values.

For multiple groupings, the result index will be a MultiIndex

Returns
-------
Series or DataFrame
    Median of values within each group.

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def min(self, **kwargs) -> Union[Series, DataFrame]:
        '''Number each group from 0 to the number of groups - 1.

This is the enumerative complement of cumcount.  Note that the
numbers given to the groups match the order in which the groups
would be seen when iterating over the groupby object, not the
order they are first observed.

Parameters
----------
ascending : bool, default True
    If False, number in reverse, from number of group - 1 to 0.

Returns
-------
Series
    Unique numbers for each group.

See Also
--------
.cumcount : Number the rows in each group.

Examples
--------

>>> df = pd.DataFrame({"A": list("aaabba")})
>>> df
    A
0  a
1  a
2  a
3  b
4  b
5  a
>>> df.groupby('A').ngroup()
0    0
1    0
2    0
3    1
4    1
5    0
dtype: int64
>>> df.groupby('A').ngroup(ascending=False)
0    1
1    1
2    1
3    0
4    0
5    1
dtype: int64
>>> df.groupby(["A", [1,1,2,3,2,1]]).ngroup()
0    0
1    0
2    1
3    3
4    2
5    0
dtype: int64
'''
        pass
    def ngroup(self, ascending: bool = ...) -> Series: ...
    def nth(self, n: Union[int, List[int]], dropna: Optional[str] = ...) -> Union[Series, DataFrame]:
        '''Take the nth row from each group if n is an int, or a subset of rows
if n is a list of ints.

If dropna, will take the nth non-null row, dropna is either
'all' or 'any'; this is equivalent to calling dropna(how=dropna)
before the groupby.

Parameters
----------
n : int or list of ints
    A single nth value for the row or a list of nth values.
dropna : None or str, optional
    Apply the specified dropna operation before counting which row is
    the nth row. Needs to be None, 'any' or 'all'.

Returns
-------
Series or DataFrame
    N-th value within each group.
        
See Also
--------
Series.groupby
DataFrame.groupby

Examples
--------

>>> df = pd.DataFrame({'A': [1, 1, 2, 1, 2],
...                    'B': [np.nan, 2, 3, 4, 5]}, columns=['A', 'B'])
>>> g = df.groupby('A')
>>> g.nth(0)
        B
A
1  NaN
2  3.0
>>> g.nth(1)
        B
A
1  2.0
2  5.0
>>> g.nth(-1)
        B
A
1  4.0
2  5.0
>>> g.nth([0, 1])
        B
A
1  NaN
1  2.0
2  3.0
2  5.0

Specifying `dropna` allows count ignoring ``NaN``

>>> g.nth(0, dropna='any')
        B
A
1  2.0
2  3.0

NaNs denote group exhausted when using dropna

>>> g.nth(3, dropna='any')
    B
A
1 NaN
2 NaN

Specifying `as_index=False` in `groupby` keeps the original index.

>>> df.groupby('A', as_index=False).nth(1)
    A    B
1  1  2.0
4  2  5.0
'''
        pass
    def ohlc(self) -> DataFrame:
        '''Compute sum of values, excluding missing values.

For multiple groupings, the result index will be a MultiIndex

Returns
-------
DataFrame
    Open, high, low and close values within each group.

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def pct_change(self, periods: int = ..., fill_method: str = ..., limit: Any = ..., freq: Any = ..., axis: _AxisType = ...) -> Union[Series, DataFrame]:
        '''Calculate pct_change of each value to previous entry in group.

Returns
-------
Series or DataFrame
    Percentage changes within each group.

See Also
--------
Series.groupby
DataFrame.groupby
'''
    def pipe(self, func: Callable, *args, **kwargs) -> Any: ...
    def prod(self, **kwargs) -> Union[Series, DataFrame]: ...
    def rank(self, method: str = ..., ascending: bool = ..., na_option: str = ..., pct: bool = ..., axis: int = ...) -> DataFrame:
        '''Provide the rank of values within each group.

Parameters
----------
method : {'average', 'min', 'max', 'first', 'dense'}, default 'average'
    * average: average rank of group.
    * min: lowest rank in group.
    * max: highest rank in group.
    * first: ranks assigned in order they appear in the array.
    * dense: like 'min', but rank always increases by 1 between groups.
ascending : bool, default True
    False for ranks by high (1) to low (N).
na_option : {'keep', 'top', 'bottom'}, default 'keep'
    * keep: leave NA values where they are.
    * top: smallest rank if ascending.
    * bottom: smallest rank if descending.
pct : bool, default False
    Compute percentage rank of data within each group.
axis : int, default 0
    The axis of the object over which to compute the rank.

Returns
-------
DataFrame with ranking of values within each group

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def sem(self, ddof: int = ...) -> Union[Series, DataFrame]:
        '''Compute standard error of the mean of groups, excluding missing values.

For multiple groupings, the result index will be a MultiIndex.

Parameters
----------
ddof : int, default 1
    Degrees of freedom.

Returns
-------
Series or DataFrame
    Standard error of the mean of values within each group.

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def size(self) -> Series:
        '''Compute group sizes.

Returns
-------
Series
    Number of rows in each group.

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def std(self, ddof: int = ...) -> Union[Series, DataFrame]:
        '''Compute standard deviation of groups, excluding missing values.

For multiple groupings, the result index will be a MultiIndex.

Parameters
----------
ddof : int, default 1
    Degrees of freedom.

Returns
-------
Series or DataFrame
    Standard deviation of values within each group.

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass
    def sum(self, **kwargs) -> Union[Series, DataFrame]: ...
    def transform(self, func: Callable, *args, **kwargs): ...
    def tail(self, n: int = ...) -> Union[Series, DataFrame]:
        '''Return last n rows of each group.

Similar to ``.apply(lambda x: x.tail(n))``, but it returns a subset of rows
from the original DataFrame with original index and order preserved
(``as_index`` flag is ignored).

Does not work for negative values of `n`.

Returns
-------
Series or DataFrame
        
See Also
--------
Series.groupby
DataFrame.groupby

Examples
--------

>>> df = pd.DataFrame([['a', 1], ['a', 2], ['b', 1], ['b', 2]],
...                   columns=['A', 'B'])
>>> df.groupby('A').tail(1)
    A  B
1  a  2
3  b  2
>>> df.groupby('A').tail(-1)
Empty DataFrame
Columns: [A, B]
Index: []
'''
        pass
    def var(self, ddof: int = ...) -> Union[Series, DataFrame]:
        '''Compute variance of groups, excluding missing values.

For multiple groupings, the result index will be a MultiIndex.

Parameters
----------
ddof : int, default 1
    Degrees of freedom.

Returns
-------
Series or DataFrame
    Variance of values within each group.

See Also
--------
Series.groupby
DataFrame.groupby
'''
        pass


class Grouper:

    def __init__(self, key: Optional[str] = ..., level: Optional[_LevelType] = ..., freq: Optional[str] = ..., axis: _AxisType = ..., sort: bool = ..., *kwargs): ...


# These are missing lots of methods still
class SeriesGroupBy(GroupBy):

    @property
    def is_monotonic_increasing(self) -> bool: ...
    @property
    def is_monotonic_decreasing(self) -> bool: ...

    def __getitem__(self, item: str) -> Series[_DType]: ...
    def bfill(self, limit: Optional[int] = ...) -> Series[_DType]: ...
    def count(self) -> Series[_DType]: ...
    def cummax(self, axis: _AxisType = ..., **kwargs) -> Series[_DType]: ...
    def cummin(self, axis: _AxisType = ..., **kwargs) -> Series[_DType]: ...
    def cumprod(self, axis: _AxisType = ..., **kwargs) -> Series[_DType]: ...
    def cumsum(self, axis: _AxisType = ..., **kwargs) -> Series[_DType]: ...
    def describe(self, **kwargs) -> Series[_np.double64]: ...
    def ffill(self, limit: Optional[int] = ...) -> Series[_DType]: ...
    def first(self, **kwargs) -> Series[_DType]: ...
    def head(self, n: int = ...) -> Series[_DType]: ...
    def last(self, **kwargs) -> Series[_DType]: ...
    def max(self, **kwargs) -> Series[_DType]: ...
    def mean(self, **kwargs) -> Series[_DType]: ...
    def median(self, **kwargs) -> Series[_DType]: ...
    def min(self, **kwargs) -> Series[_DType]: ...
    def nlargest(self, n: int = ..., keep: str = ...) -> Series[_DType]: ...
    def nsmallest(self, n: int = ..., keep: str = ...) -> Series[_DType]: ...
    def nth(self, n: Union[int, List[int]], dropna: Optional[str] = ...) -> Series[_DType]: ...
    def nunique(self, dropna: bool = ...) -> Series: ...
    def std(self, ddof: int = ...) -> Series[_DType]: ...
    def pct_change(self, periods: int = ..., fill_method: str = ..., limit: Any = ..., freq: Any = ..., axis: _AxisType = ...) -> Series[_DType]: ...
    def prod(self, **kwargs) -> Series[_DType]: ...
    def sem(self, ddof: int = ...) -> Series[_DType]: ...
    def std(self, ddof: int = ...) -> Series[_DType]: ...
    def sum(self, **kwargs) -> Series[_DType]: ...
    def tail(self, n: int = ...) -> Series[_DType]: ...
    def value_counts(self, normalize: bool = ..., sort: bool = ..., ascending: bool = ..., bins: Any = ..., dropna: bool = ...) -> DataFrame: ...
    def var(self, ddof: int = ...) -> Series[_DType]: ...


# These are missing lots of methods still
class DataFrameGroupBy(GroupBy):

    @property
    def corr(self, method: Union[str, Callable], min_periods: int = ...) -> DataFrame: ...
    @property
    def cov(self, min_periods: int = ...) -> DataFrame: ...
    @property
    def diff(periods: int = ..., axis: _AxisType = ...) -> DataFrame: ...

    @overload
    def __getitem__(self, item: str) -> Series[_DType]: ...
    @overload
    def __getitem__(self, item: List[str]) -> DataFrame: ...
    @overload
    def aggregate(self, arg: str, *args, **kwargs) -> DataFrame:
        '''Aggregate using one or more operations over the specified axis.

Parameters
----------
func : function, str, list or dict
    Function to use for aggregating the data. If a function, must either
    work when passed a DataFrame or when passed to DataFrame.apply.

    Accepted combinations are:

    - function
    - string function name
    - list of functions and/or function names, e.g. ``[np.sum, 'mean']``
    - dict of axis labels -> functions, function names or list of such.

*args
    Positional arguments to pass to `func`.
**kwargs
    Keyword arguments to pass to `func`.

Returns
-------
scalar, Series or DataFrame

    The return can be:

    * scalar : when Series.agg is called with single function
    * Series : when DataFrame.agg is called with a single function
    * DataFrame : when DataFrame.agg is called with several functions

    Return scalar, Series or DataFrame.

See Also
--------
pandas.DataFrame.groupby.apply
pandas.DataFrame.groupby.transform
pandas.DataFrame.aggregate

Notes
-----
`agg` is an alias for `aggregate`. Use the alias.

A passed user-defined-function will be passed a Series for evaluation.

Examples
--------

>>> df = pd.DataFrame({'A': [1, 1, 2, 2],
...                    'B': [1, 2, 3, 4],
...                    'C': np.random.randn(4)})

>>> df
   A  B         C
0  1  1  0.362838
1  1  2  0.227877
2  2  3  1.267767
3  2  4 -0.562860

The aggregation is for each column.

>>> df.groupby('A').agg('min')
   B         C
A
1  1  0.227877
2  3 -0.562860

Multiple aggregations

>>> df.groupby('A').agg(['min', 'max'])
    B             C
  min max       min       max
A
1   1   2  0.227877  0.362838
2   3   4 -0.562860  1.267767

Select a column for aggregation

>>> df.groupby('A').B.agg(['min', 'max'])
   min  max
A
1    1    2
2    3    4

Different aggregations per column

>>> df.groupby('A').agg({'B': ['min', 'max'], 'C': 'sum'})
    B             C
  min max       sum
A
1   1   2  0.590716
2   3   4  0.704907

To control the output names with different aggregations per column,
pandas supports "named aggregation"

>>> df.groupby("A").agg(
...     b_min=pd.NamedAgg(column="B", aggfunc="min"),
...     c_sum=pd.NamedAgg(column="C", aggfunc="sum"))
   b_min     c_sum
A
1      1 -1.956929
2      3 -0.322183

- The keywords are the *output* column names
- The values are tuples whose first element is the column to select
  and the second element is the aggregation to apply to that column.
  Pandas provides the ``pandas.NamedAgg`` namedtuple with the fields
  ``['column', 'aggfunc']`` to make it clearer what the arguments are.
  As usual, the aggregation can be a callable or a string alias.

See :ref:`groupby.aggregate.named` for more.
'''
        pass
    @overload
    def aggregate(self, arg: Dict, *args, **kwargs) -> DataFrame: ...
    @overload
    def aggregate(self, arg: Callable[[],Any], *args, **kwargs) -> DataFrame: ...
    def bfill(self, limit: Optional[int] = ...) -> DataFrame: ...
    def boxplot(self, grouped: DataFrame, subplots: bool = ..., column: Optiona[Union[str, Sequence]] = ..., fontsize: Union[int, str] = ..., rot: float = ..., grid: bool = ..., ax: Optional[matplotlib.axes.Axes] = ..., figsize: Optional[Tuple[float, float]] = ..., layout: Optional[Tuple[int, int]] = ..., sharex: bool = ..., sharey: bool = ..., bins: Union[int, Sequence] = ..., backend: Optional[str] = ..., **kwargs) -> Union[matplotlib.AxesSubplot, List[matplotlib.AxesSubplot]]:
        '''Make box plots from DataFrameGroupBy data.

Parameters
----------
grouped : Grouped DataFrame
subplots : bool
    * ``False`` - no subplots will be used
    * ``True`` - create a subplot for each group.

column : column name or list of names, or vector
    Can be any valid input to groupby.
fontsize : int or str
rot : label rotation angle
grid : Setting this to True will show the grid
ax : Matplotlib axis object, default None
figsize : A tuple (width, height) in inches
layout : tuple (optional)
    The layout of the plot: (rows, columns).
sharex : bool, default False
    Whether x-axes will be shared among subplots.

    .. versionadded:: 0.23.1
sharey : bool, default True
    Whether y-axes will be shared among subplots.

    .. versionadded:: 0.23.1
backend : str, default None
    Backend to use instead of the backend specified in the option
    ``plotting.backend``. For instance, 'matplotlib'. Alternatively, to
    specify the ``plotting.backend`` for the whole session, set
    ``pd.options.plotting.backend``.

    .. versionadded:: 1.0.0

**kwargs
    All other plotting keyword arguments to be passed to
    matplotlib's boxplot function.

Returns
-------
dict of key/value = group key/DataFrame.boxplot return value
or DataFrame.boxplot return value in case subplots=figures=False

Examples
--------
>>> import itertools
>>> tuples = [t for t in itertools.product(range(1000), range(4))]
>>> index = pd.MultiIndex.from_tuples(tuples, names=['lvl0', 'lvl1'])
>>> data = np.random.randn(len(index),4)
>>> df = pd.DataFrame(data, columns=list('ABCD'), index=index)
>>>
>>> grouped = df.groupby(level='lvl1')
>>> boxplot_frame_groupby(grouped)
>>>
>>> grouped = df.unstack(level='lvl1').groupby(level=0, axis=1)
>>> boxplot_frame_groupby(grouped, subplots=False)
'''
        pass
    def corrwith(self, other: DataFrame, axis: _AxisType = ..., drop: bool = ..., method: str = ...) -> Series:
        '''Compute pairwise correlation.

Pairwise correlation is computed between rows or columns of
DataFrame with rows or columns of Series or DataFrame. DataFrames
are first aligned along both axes before computing the
correlations.

Parameters
----------
other : DataFrame, Series
    Object with which to compute correlations.
axis : {0 or 'index', 1 or 'columns'}, default 0
    The axis to use. 0 or 'index' to compute column-wise, 1 or 'columns' for
    row-wise.
drop : bool, default False
    Drop missing indices from result.
method : {'pearson', 'kendall', 'spearman'} or callable
    Method of correlation:

    * pearson : standard correlation coefficient
    * kendall : Kendall Tau correlation coefficient
    * spearman : Spearman rank correlation
    * callable: callable with input two 1d ndarrays
        and returning a float.

    .. versionadded:: 0.24.0

Returns
-------
Series
    Pairwise correlations.

See Also
--------
DataFrame.corr
'''
        pass
    def count(self) -> DataFrame:
        '''Compute count of group, excluding missing values.

Returns
-------
DataFrame
    Count of values within each group.
'''
        pass
    def cummax(self, axis: _AxisType = ..., **kwargs) -> DataFrame: ...
    def cummin(self, axis: _AxisType = ..., **kwargs) -> DataFrame: ...
    def cumprod(self, axis: _AxisType = ..., **kwargs) -> DataFrame: ...
    def cumsum(self, axis: _AxisType = ..., **kwargs) -> DataFrame: ...
    def describe(self, **kwargs) -> DataFrame: ...
    def ffill(self, limit: Optional[int] = ...) -> DataFrame: ...
    @overload
    def fillna(self, value: Any, method: Optional[str] = ..., axis: _AxisType = ..., limit: Optional[int] = ..., downcast: Optional[Dict] = ..., *, inplace: Literal[True]) -> None:
        '''Fill NA/NaN values using the specified method.

Parameters
----------
value : scalar, dict, Series, or DataFrame
    Value to use to fill holes (e.g. 0), alternately a
    dict/Series/DataFrame of values specifying which value to use for
    each index (for a Series) or column (for a DataFrame).  Values not
    in the dict/Series/DataFrame will not be filled. This value cannot
    be a list.
method : {'backfill', 'bfill', 'pad', 'ffill', None}, default None
    Method to use for filling holes in reindexed Series
    pad / ffill: propagate last valid observation forward to next valid
    backfill / bfill: use next valid observation to fill gap.
axis : {0 or 'index', 1 or 'columns'}
    Axis along which to fill missing values.
inplace : bool, default False
    If True, fill in-place. Note: this will modify any
    other views on this object (e.g., a no-copy slice for a column in a
    DataFrame).
limit : int, default None
    If method is specified, this is the maximum number of consecutive
    NaN values to forward/backward fill. In other words, if there is
    a gap with more than this number of consecutive NaNs, it will only
    be partially filled. If method is not specified, this is the
    maximum number of entries along the entire axis where NaNs will be
    filled. Must be greater than 0 if not None.
downcast : dict, default is None
    A dict of item->dtype of what to downcast if possible,
    or the string 'infer' which will try to downcast to an appropriate
    equal type (e.g. float64 to int64 if possible).

Returns
-------
DataFrame or None
    Object with missing values filled or None if ``inplace=True``.

See Also
--------
interpolate : Fill NaN values using interpolation.
reindex : Conform object to new index.
asfreq : Convert TimeSeries to specified frequency.

Examples
--------
>>> df = pd.DataFrame([[np.nan, 2, np.nan, 0],
...                    [3, 4, np.nan, 1],
...                    [np.nan, np.nan, np.nan, 5],
...                    [np.nan, 3, np.nan, 4]],
...                   columns=list('ABCD'))
>>> df
     A    B   C  D
0  NaN  2.0 NaN  0
1  3.0  4.0 NaN  1
2  NaN  NaN NaN  5
3  NaN  3.0 NaN  4

Replace all NaN elements with 0s.

>>> df.fillna(0)
    A   B   C   D
0   0.0 2.0 0.0 0
1   3.0 4.0 0.0 1
2   0.0 0.0 0.0 5
3   0.0 3.0 0.0 4

We can also propagate non-null values forward or backward.

>>> df.fillna(method='ffill')
    A   B   C   D
0   NaN 2.0 NaN 0
1   3.0 4.0 NaN 1
2   3.0 4.0 NaN 5
3   3.0 3.0 NaN 4

Replace all NaN elements in column 'A', 'B', 'C', and 'D', with 0, 1,
2, and 3 respectively.

>>> values = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
>>> df.fillna(value=values)
    A   B   C   D
0   0.0 2.0 2.0 0
1   3.0 4.0 2.0 1
2   0.0 1.0 2.0 5
3   0.0 3.0 2.0 4

Only replace the first NaN element.

>>> df.fillna(value=values, limit=1)
    A   B   C   D
0   0.0 2.0 2.0 0
1   3.0 4.0 NaN 1
2   NaN 1.0 NaN 5
3   NaN 3.0 NaN 4
'''
        pass
    @overload
    def fillna(self, value: Any, method: Optional[str] = ..., axis: _AxisType = ..., inplace: Literal[False] = ..., limit: Optional[int] = ..., downcast: Optional[Dict] = ...) -> DataFrame: ...
    def filter(self, func: Callable, dropna: bool = ..., *args, **kwargs) -> DataFrame:
        '''Return a copy of a DataFrame excluding elements from groups that
do not satisfy the boolean criterion specified by func.

Parameters
----------
f : function
    Function to apply to each subframe. Should return True or False.
dropna : Drop groups that do not pass the filter. True by default;
    If False, groups that evaluate False are filled with NaNs.

Returns
-------
filtered : DataFrame

Notes
-----
Each subframe is endowed the attribute 'name' in case you need to know
which group you are working on.

Examples
--------
>>> df = pd.DataFrame({'A' : ['foo', 'bar', 'foo', 'bar',
...                           'foo', 'bar'],
...                    'B' : [1, 2, 3, 4, 5, 6],
...                    'C' : [2.0, 5., 8., 1., 2., 9.]})
>>> grouped = df.groupby('A')
>>> grouped.filter(lambda x: x['B'].mean() > 3.)
        A  B    C
1  bar  2  5.0
3  bar  4  1.0
5  bar  6  9.0
'''
        pass
    def first(self, **kwargs) -> DataFrame: ...
    def head(self, n: int = ...) -> DataFrame: ...
    def hist(self, data: DataFrame, column: Optiona[Union[str, Sequence]] = ..., by: Any = ..., grid: bool = ..., xlabelsize: Optional[int] = ..., xrot: Optional[float] = ..., ylabelsize: Optional[int] = ..., yrot: Optional[float] = ..., ax: Optional[matplotlib.axes.Axes] = ..., sharex: bool = ..., sharey: bool = ..., figsize: Optional[Tuple[float, float]] = ..., layout: Optional[Tuple[int, int]] = ..., bins: Union[int, Sequence] = ..., backend: Optional[str] = ..., **kwargs) -> Union[matplotlib.AxesSubplot, List[matplotlib.AxesSubplot]]:
        '''Make a histogram of the DataFrame's.

A `histogram`_ is a representation of the distribution of data.
This function calls :meth:`matplotlib.pyplot.hist`, on each series in
the DataFrame, resulting in one histogram per column.

.. _histogram: https://en.wikipedia.org/wiki/Histogram

Parameters
----------
data : DataFrame
    The pandas object holding the data.
column : str or sequence
    If passed, will be used to limit data to a subset of columns.
by : object, optional
    If passed, then used to form histograms for separate groups.
grid : bool, default True
    Whether to show axis grid lines.
xlabelsize : int, default None
    If specified changes the x-axis label size.
xrot : float, default None
    Rotation of x axis labels. For example, a value of 90 displays the
    x labels rotated 90 degrees clockwise.
ylabelsize : int, default None
    If specified changes the y-axis label size.
yrot : float, default None
    Rotation of y axis labels. For example, a value of 90 displays the
    y labels rotated 90 degrees clockwise.
ax : Matplotlib axes object, default None
    The axes to plot the histogram on.
sharex : bool, default True if ax is None else False
    In case subplots=True, share x axis and set some x axis labels to
    invisible; defaults to True if ax is None otherwise False if an ax
    is passed in.
    Note that passing in both an ax and sharex=True will alter all x axis
    labels for all subplots in a figure.
sharey : bool, default False
    In case subplots=True, share y axis and set some y axis labels to
    invisible.
figsize : tuple
    The size in inches of the figure to create. Uses the value in
    `matplotlib.rcParams` by default.
layout : tuple, optional
    Tuple of (rows, columns) for the layout of the histograms.
bins : int or sequence, default 10
    Number of histogram bins to be used. If an integer is given, bins + 1
    bin edges are calculated and returned. If bins is a sequence, gives
    bin edges, including left edge of first bin and right edge of last
    bin. In this case, bins is returned unmodified.
backend : str, default None
    Backend to use instead of the backend specified in the option
    ``plotting.backend``. For instance, 'matplotlib'. Alternatively, to
    specify the ``plotting.backend`` for the whole session, set
    ``pd.options.plotting.backend``.

    .. versionadded:: 1.0.0

**kwargs
    All other plotting keyword arguments to be passed to
    :meth:`matplotlib.pyplot.hist`.

Returns
-------
matplotlib.AxesSubplot or numpy.ndarray of them

See Also
--------
matplotlib.pyplot.hist : Plot a histogram using matplotlib.

Examples
--------

.. plot::
    :context: close-figs

    This example draws a histogram based on the length and width of
    some animals, displayed in three bins

    >>> df = pd.DataFrame({
    ...     'length': [1.5, 0.5, 1.2, 0.9, 3],
    ...     'width': [0.7, 0.2, 0.15, 0.2, 1.1]
    ...     }, index=['pig', 'rabbit', 'duck', 'chicken', 'horse'])
    >>> hist = df.hist(bins=3)
'''
        pass
    def idxmax(self, axis: _AxisType = ..., skipna: bool = ...) -> Series:
        '''Return index of first occurrence of maximum over requested axis.

NA/null values are excluded.

Parameters
----------
axis : {0 or 'index', 1 or 'columns'}, default 0
    The axis to use. 0 or 'index' for row-wise, 1 or 'columns' for column-wise.
skipna : bool, default True
    Exclude NA/null values. If an entire row/column is NA, the result
    will be NA.

Returns
-------
Series
    Indexes of maxima along the specified axis.

Raises
------
ValueError
    * If the row/column is empty

See Also
--------
Series.idxmax

Notes
-----
This method is the DataFrame version of ``ndarray.argmax``.
'''
        pass
    def idxmin(self, axis: _AxisType = ..., skipna: bool = ...) -> Series:
        '''Return index of first occurrence of minimum over requested axis.

NA/null values are excluded.

Parameters
----------
axis : {0 or 'index', 1 or 'columns'}, default 0
    The axis to use. 0 or 'index' for row-wise, 1 or 'columns' for column-wise.
skipna : bool, default True
    Exclude NA/null values. If an entire row/column is NA, the result
    will be NA.

Returns
-------
Series
    Indexes of minima along the specified axis.

Raises
------
ValueError
    * If the row/column is empty

See Also
--------
Series.idxmin

Notes
-----
This method is the DataFrame version of ``ndarray.argmin``.
'''
        pass
    def last(self, **kwargs) -> DataFrame: ...
    @overload
    def mad(self, axis: _AxisType = ..., skipna: bool = ..., numeric_only: Optional[bool] = ..., *, level: _LevelType, **kwargs) -> DataFrame:
        '''Return the mean absolute deviation of the values for the requested axis.

Parameters
----------
axis : {index (0), columns (1)}
    Axis for the function to be applied on.
skipna : bool, default True
    Exclude NA/null values when computing the result.
level : int or level name, default None
    If the axis is a MultiIndex (hierarchical), count along a
    particular level, collapsing into a Series.
numeric_only : bool, default None
    Include only float, int, boolean columns. If None, will attempt to use
    everything, then use only numeric data. Not implemented for Series.
**kwargs
    Additional keyword arguments to be passed to the function.

Returns
-------
Series or DataFrame (if level specified)
'''
        pass
    @overload
    def mad(self, axis: _AxisType = ..., skipna: bool = ..., level: None = ..., numeric_only: Optional[bool] = ..., **kwargs) -> Series: ...
    def max(self, **kwargs) -> DataFrame: ...
    def mean(self, **kwargs) -> DataFrame: ...
    def median(self, **kwargs) -> DataFrame: ...
    def min(self, **kwargs) -> DataFrame: ...
    def nth(self, n: Union[int, List[int]], dropna: Optional[str] = ...) -> DataFrame: ...
    def nunique(self, dropna: bool = ...) -> DataFrame:
        '''
Return DataFrame with number of distinct observations per group for
each column.

Parameters
----------
dropna : bool, default True
    Don't include NaN in the counts.

Returns
-------
nunique: DataFrame

Examples
--------
>>> df = pd.DataFrame({'id': ['spam', 'egg', 'egg', 'spam',
...                           'ham', 'ham'],
...                    'value1': [1, 5, 5, 2, 5, 5],
...                    'value2': list('abbaxy')})
>>> df
        id  value1 value2
0  spam       1      a
1   egg       5      b
2   egg       5      b
3  spam       2      a
4   ham       5      x
5   ham       5      y

>>> df.groupby('id').nunique()
    id  value1  value2
id
egg    1       1       1
ham    1       1       2
spam   1       2       1

Check for rows with the same id but conflicting values:

>>> df.groupby('id').filter(lambda g: (g.nunique() > 1).any())
        id  value1 value2
0  spam       1      a
3  spam       2      a
4   ham       5      x
5   ham       5      y
'''
        pass
    def pct_change(self, periods: int = ..., fill_method: str = ..., limit: Any = ..., freq: Any = ..., axis: _AxisType = ...) -> DataFrame: ...
    def prod(self, **kwargs) -> DataFrame: ...
    def quantile(self, q: float = ..., interpolation: str = ...) -> DataFrame: ...
    def rank(self, method: str = ..., ascending: bool = ..., na_option: str = ..., pct: bool = ..., axis: _AxisType = ...) -> DataFrame: ...
    def resample(self, rule: Any, *args, **kwargs) -> Grouper: ...
    def sem(self, ddof: int = ...) -> DataFrame: ...
    def shift(self, periods: int = ..., freq: str = ..., axis: _AxisType = ..., fill_value: Any = ...) -> DataFrame: ...
    def size(self) -> Series[int]: ...
    @overload
    def skew(self, axis: _AxisType = ..., skipna: bool = ..., numeric_only: bool = ..., *, level: _LevelType, **kwargs) -> DataFrame:
        '''Return unbiased skew over requested axis.

Normalized by N-1.

Parameters
----------
axis : {index (0), columns (1)}
    Axis for the function to be applied on.
skipna : bool, default True
    Exclude NA/null values when computing the result.
level : int or level name, default None
    If the axis is a MultiIndex (hierarchical), count along a
    particular level, collapsing into a Series.
numeric_only : bool, default None
    Include only float, int, boolean columns. If None, will attempt to use
    everything, then use only numeric data. Not implemented for Series.
**kwargs
    Additional keyword arguments to be passed to the function.

Returns
-------
Series or DataFrame (if level specified)
'''
        pass
    @overload
    def skew(self, axis: _AxisType = ..., skipna: bool = ..., level: None = ..., numeric_only: bool = ..., **kwargs) -> Series: ...
    def std(self, ddof: int = ...) -> DataFrame: ...
    def sum(self, **kwargs) -> DataFrame: ...
    def tail(self, n: int = ...) -> DataFrame: ...
    def take(self, indices: List, axis: _AxisType = ..., **kwargs) -> DataFrame:
        '''Return the elements in the given *positional* indices along an axis.

This means that we are not indexing according to actual values in
the index attribute of the object. We are indexing according to the
actual position of the element in the object.

Parameters
----------
indices : array-like
    An array of ints indicating which positions to take.
axis : {0 or 'index', 1 or 'columns', None}, default 0
    The axis on which to select elements. ``0`` means that we are
    selecting rows, ``1`` means that we are selecting columns.
is_copy : bool
    Before pandas 1.0, ``is_copy=False`` can be specified to ensure
    that the return value is an actual copy. Starting with pandas 1.0,
    ``take`` always returns a copy, and the keyword is therefore
    deprecated.

    .. deprecated:: 1.0.0
**kwargs
    For compatibility with :meth:`numpy.take`. Has no effect on the
    output.

Returns
-------
taken : same type as caller
    An array-like containing the elements taken from the object.

See Also
--------
DataFrame.loc : Select a subset of a DataFrame by labels.
DataFrame.iloc : Select a subset of a DataFrame by positions.
numpy.take : Take elements from an array along an axis.

Examples
--------
>>> df = pd.DataFrame([('falcon', 'bird', 389.0),
...                    ('parrot', 'bird', 24.0),
...                    ('lion', 'mammal', 80.5),
...                    ('monkey', 'mammal', np.nan)],
...                   columns=['name', 'class', 'max_speed'],
...                   index=[0, 2, 3, 1])
>>> df
        name   class  max_speed
0  falcon    bird      389.0
2  parrot    bird       24.0
3    lion  mammal       80.5
1  monkey  mammal        NaN

Take elements at positions 0 and 3 along the axis 0 (default).

Note how the actual indices selected (0 and 1) do not correspond to
our selected indices 0 and 3. That's because we are selecting the 0th
and 3rd rows, not rows whose indices equal 0 and 3.

>>> df.take([0, 3])
        name   class  max_speed
0  falcon    bird      389.0
1  monkey  mammal        NaN

Take elements at indices 1 and 2 along the axis 1 (column selection).

>>> df.take([1, 2], axis=1)
    class  max_speed
0    bird      389.0
2    bird       24.0
3  mammal       80.5
1  mammal        NaN

We may take elements using negative integers for positive indices,
starting from the end of the object, just like with Python lists.

>>> df.take([-1, -2])
        name   class  max_speed
1  monkey  mammal        NaN
3    lion  mammal       80.5
'''
        pass
    def tshift(self, periods: int, freq: Any = ..., axis: _AxisType = ...) -> DataFrame: ...
    def var(self, ddof: int = ...) -> DataFrame: ...

