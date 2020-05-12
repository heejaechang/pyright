"""Pandas public API"""

""" 
These stubs are heavily based on Pandas 1.0.3 docs.

Areas that still need a lot of work include Window/Rolling, Resampling
and a lot of time series related APIs.
"""


from typing import Tuple, List, Union, IO, Optional, Any, overload, Callable, Dict, Protocol, Sequence
if sys.version_info >= (3, 8):
    from typing import Literal
else:
    from typing_extensions import Literal
from pathlib import Path
import numpy as _np
from . import core as core
from .core import DataFrame, Series, Index
from . import errors as errors
from . import plotting as plotting
from . import testing as testing

_AxisType = Literal["columns", "index"]
_Path_or_Buf = Union[str, Path, IO]

class TextParser():
    def read(self) -> DataFrame: ...


class _SupportsRead(Protocol):
    def read(self) -> str: ...


# I/O Functions

def read_clipboard(sep: str = ..., **kwargs) -> DataFrame: ...
@overload
def read_csv(reader: IO, sep: str = ..., delimiter: Optional[str] = ..., header: Union[int, List[int], Literal['infer']] = ..., names: Optional[Sequence[str]] = ..., index_col: Optional[Union[int, str, Sequence, Literal[False]]] = ..., usecols: Optional[Union[int, str, Sequence]] = ..., squeeze: bool = ..., prefix: Optional[str] = ..., mangle_dupe_cols: bool = ..., dtype: Optional[Union[str, Dict[str, Any]]] = ..., engine: Optional[Literal['c', 'python']] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skipinitialspace: bool = ..., skiprows: Optional[Union[Sequence, int, Callable]] = ..., skipfooter: int = ..., nrows: Optional[int] = ..., na_values: Optional[Any] = ..., keep_default_na: bool = ..., na_filter: bool = ..., verbose: bool = ..., skip_blank_lines: bool = ..., parse_dates: bool = ..., infer_datetime_format: bool = ..., keep_date_col: bool = ..., date_parser: Optional[Callable] = ..., dayfirst: bool = ..., cache_dates: bool = ..., iterator: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., thousands: Optional[str] = ..., decimal: Optional[str] = ..., lineterminator: Optional[str] = ..., quotechar: str = ..., quoting: int = ..., doublequote: bool = ..., escapechar: Optiona[str] = ..., comment: Optional[str] = ..., encoding: Optional[str] = ..., dialect: Optional[str] = ..., error_bad_lines: bool = ..., warn_bad_lines: bool = ..., delim_whitespace: bool = ..., low_memory: bool = ..., memory_map: bool = ..., float_precision: Optional[str] = ...) -> TextParser: ...
@overload
def read_csv(filepath: Union[str, Path], sep: str = ..., delimiter: Optional[str] = ..., header: Union[int, List[int], Literal['infer']] = ..., names: Optional[Sequence[str]] = ..., index_col: Optional[Union[int, str, Sequence, Literal[False]]] = ..., usecols: Optional[Union[int, str, Sequence]] = ..., squeeze: bool = ..., prefix: Optional[str] = ..., mangle_dupe_cols: bool = ..., dtype: Optional[Union[str, Dict[str, Any]]] = ..., engine: Optional[Literal['c', 'python']] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skipinitialspace: bool = ..., skiprows: Optional[Union[Sequence, int, Callable]] = ..., skipfooter: int = ..., nrows: Optional[int] = ..., na_values: Optional[Any] = ..., keep_default_na: bool = ..., na_filter: bool = ..., verbose: bool = ..., skip_blank_lines: bool = ..., parse_dates: bool = ..., infer_datetime_format: bool = ..., keep_date_col: bool = ..., date_parser: Optional[Callable] = ..., dayfirst: bool = ..., cache_dates: bool = ..., iterator: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., thousands: Optional[str] = ..., decimal: Optional[str] = ..., lineterminator: Optional[str] = ..., quotechar: str = ..., quoting: int = ..., doublequote: bool = ..., escapechar: Optiona[str] = ..., comment: Optional[str] = ..., encoding: Optional[str] = ..., dialect: Optional[str] = ..., error_bad_lines: bool = ..., warn_bad_lines: bool = ..., delim_whitespace: bool = ..., low_memory: bool = ..., memory_map: bool = ..., float_precision: Optional[str] = ...) -> DataFrame: ...
@overload
def read_excel(filepath: str, sheet_name: Optional[List[Union[int, str]]], header: Union[int, List[int]] = ..., names: Optional[List[str]] = ..., index_col: Optional[Union[int, Sequence[int]]] = ..., usecols: Optional[Union[int, str, Sequence[Union[int, str], Callable]]], squeeze: bool = ..., dtype: Union[str, Dict[str, Any]], engine: Optional[str] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skiprows: Optional[List[int]] = ..., nrows: Optional[int] = ..., na_values: Any = ..., keep_default_na: bool = ..., verbose: bool = ..., parse_dates: Union[bool, List, Dict[str, List]] = ..., date_parser: Optional[Callable] = ..., thousands: Optional[str] = ..., comment: Optional[str] = ..., skipfooter: int = ..., convert_float: bool = ..., mangle_dupe_cols: bool = ..., ) -> Dict[Union[int, str], DataFrame]: ...
@overload
def read_excel(filepath: str, sheet_name: Union[int, str] = ..., header: Union[int, List[int]] = ..., names: Optional[List[str]] = ..., index_col: Optional[Union[int, Sequence[int]]] = ..., usecols: Optional[Union[int, str, Sequence[Union[int, str], Callable]]], squeeze: bool = ..., dtype: Union[str, Dict[str, Any]], engine: Optional[str] = ..., converters: Optional[Dict[Union[int, str], Callable]]= ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skiprows: Optional[List[int]] = ..., nrows: Optional[int] = ..., na_values: Any = ..., keep_default_na: bool = ..., verbose: bool = ..., parse_dates: Union[bool, List, Dict[str, List]] = ..., date_parser: Optional[Callable] = ..., thousands: Optional[str] = ..., comment: Optional[str] = ..., skipfooter: int = ..., convert_float: bool = ..., mangle_dupe_cols: bool = ..., **kwargs) -> DataFrame: ...
def read_feather(p: Union[str, Path, IO], columns: Optional[Sequence] = ..., use_threads: bool = ...) -> Any: ...
@overload
def read_fwf(filepath: Union[str, Path], colspecs:Union[List[Tuple[int, int]], Literal['infer']] = ..., widths: Optional[List[int]] = ..., infer_nrows: int = ...,) -> DataFrame: ...
@overload
def read_fwf(reader: IO, colspecs:Union[List[Tuple[int, int]], Literal['infer']] = ..., widths: Optional[List[int]] = ..., infer_nrows: int = ...,) -> TextParser: ...
def read_hdf(path_or_buf: Union[str, Path, IO], key: Any = ..., mode: str = ..., errors: str = ..., where: Optional[List[Any]] = ..., start: Optional[int] = ..., stop: Optional[int] = ..., columns: Optional[List[str]] = ..., iterator: bool = ..., chunksize: Optional[int] = ..., **kwargs) -> Any: ...
def read_html(io: Union[str, Path, IO], match: str = ..., flavor: Optional[str] = ..., header: Optional[Union[int, List[int]]] = ..., index_col: Optional[Union[int, Sequence]] = ..., skiprows: Optional[int, Sequence, Slice] = ..., attrs: Optional[Dict[str, str]] = ..., parse_dates: bool = ..., thousands: str = ..., encoding: Optional[str] = ..., decimal: str = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., na_values: Optional[Iterable] = ..., keep_default_na: bool = ..., displayed_only: bool = ...) -> List[DataFrame]: ...
@overload
def read_json(path: Union[str, Path, IO], orient: Optional[str] = ..., typ: Literal['series'], dtype: Any = ..., convert_axes: Any = ..., convert_dates: bool = ..., keep_default_dates: bool = ..., numpy: bool = ..., precise_float: bool = ..., date_unit: Optional[str] = ..., encoding: Optional[str] = ..., lines: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ...) -> Series: ...
@overload
def read_json(path: Union[str, Path, IO], orient: Optional[str] = ..., typ: Literal['frame'] = ..., dtype: Any = ..., convert_axes: Any = ..., convert_dates: bool = ..., keep_default_dates: bool = ..., numpy: bool = ..., precise_float: bool = ..., date_unit: Optional[str] = ..., encoding: Optional[str] = ..., lines: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ...) -> DataFrame: ...
def read_orc(path: Union[str, Path, IO], columns: Optional[List[str]] = ..., **kwargs) -> DataFrame: ...
def read_pickle(filepath_or_buffer_or_reader: _Path_or_Buf, compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ...) -> Any: ...
def read_parquet(path: Union[str, Path, IO], engine: str = ..., columns: Optional[List[str]] = ..., **kwargs) -> DataFrame: ...
def read_sas(path: Union[str, Path, IO], format: Optional[str] = ..., index: Optional[List[Any]] = ..., encoding: Optional[str] = ..., chunksize: Optional[int] = ..., iterator: bool = ...) -> Any: ...
def read_spss(path: Union[str, Path, IO], usecols: Optional[Sequence[str]] = ..., convert_categoricals: bool = ...) -> DataFrame: ...
def read_sql(sql: Union[str, Any], con: Union[str, Any] = ..., index_col: Optional[Union[str, List[str]]] = ..., coerce_float: bool = ..., params: Optional[Union[List[str], Tuple[str, ...], Dict[str, str]]] = ..., parse_dates: Optional[Union[List[str], Dict[str, str], Dict[str, Dict[str, Any]]]] = ..., columns: List[str] = ..., chunksize: int = ...,) -> DataFrame: ...
def read_sql_query(sql: Any, con: Any, schema: Optional[str] = ..., index_col: Optional[Union[str, List[str]]] = ..., coerce_float: bool = ..., params: Any, parse_dates: Optional[List[str], Dict[str, str]] = ..., chunksize: Optional[int] = ...) -> DataFrame: ...
def read_sql_table(table_name: str, con: Any, schema: Optional[str] = ..., index_col: Optional[Union[str, List[str]]] = ..., coerce_float: bool = ..., parse_dates: Optional[List[str], Dict[str, str]] = ..., columns: Optional[List[str]] = ..., chunksize: Optional[int] = ...) -> DataFrame: ...
def read_stata(path: Union[str, Path, IO], convert_dates: bool = ..., convert_categoricals: bool = ..., index_col: Optional[str] = ..., convert_missing: bool = ..., preserve_dtypes: bool = ..., columns: Optional[List[str]] = ..., order_categoricals: bool = ..., chunksize: Optional[int] = ..., iterator: bool = ...) -> DataFrame: ...
@overload
def read_table(reader: IO, sep: str = ..., delimiter: Optional[str] = ..., header: Union[int, List[int], Literal['infer']] = ..., names: Optional[Sequence[str]] = ..., index_col: Optional[Union[int, str, Sequence, Literal[False]]] = ..., usecols: Optional[Union[int, str, Sequence]] = ..., squeeze: bool = ..., prefix: Optional[str] = ..., mangle_dupe_cols: bool = ..., dtype: Optional[Union[str, Dict[str, Any]]] = ..., engine: Optional[Literal['c', 'python']] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skipinitialspace: bool = ..., skiprows: Optional[Union[Sequence, int, Callable]] = ..., skipfooter: int = ..., nrows: Optional[int] = ..., na_values: Optional[Any] = ..., keep_default_na: bool = ..., na_filter: bool = ..., verbose: bool = ..., skip_blank_lines: bool = ..., parse_dates: bool = ..., infer_datetime_format: bool = ..., keep_date_col: bool = ..., date_parser: Optional[Callable] = ..., dayfirst: bool = ..., cache_dates: bool = ..., iterator: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., thousands: Optional[str] = ..., decimal: Optional[str] = ..., lineterminator: Optional[str] = ..., quotechar: str = ..., quoting: int = ..., doublequote: bool = ..., escapechar: Optiona[str] = ..., comment: Optional[str] = ..., encoding: Optional[str] = ..., dialect: Optional[str] = ..., error_bad_lines: bool = ..., warn_bad_lines: bool = ..., delim_whitespace: bool = ..., low_memory: bool = ..., memory_map: bool = ..., float_precision: Optional[str] = ...) -> TextParser: ...
@overload
def read_table(filepath: Union[str, Path], sep: str = ..., delimiter: Optional[str] = ..., header: Union[int, List[int], Literal['infer']] = ..., names: Optional[Sequence[str]] = ..., index_col: Optional[Union[int, str, Sequence, Literal[False]]] = ..., usecols: Optional[Union[int, str, Sequence]] = ..., squeeze: bool = ..., prefix: Optional[str] = ..., mangle_dupe_cols: bool = ..., dtype: Optional[Union[str, Dict[str, Any]]] = ..., engine: Optional[Literal['c', 'python']] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skipinitialspace: bool = ..., skiprows: Optional[Union[Sequence, int, Callable]] = ..., skipfooter: int = ..., nrows: Optional[int] = ..., na_values: Optional[Any] = ..., keep_default_na: bool = ..., na_filter: bool = ..., verbose: bool = ..., skip_blank_lines: bool = ..., parse_dates: bool = ..., infer_datetime_format: bool = ..., keep_date_col: bool = ..., date_parser: Optional[Callable] = ..., dayfirst: bool = ..., cache_dates: bool = ..., iterator: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., thousands: Optional[str] = ..., decimal: Optional[str] = ..., lineterminator: Optional[str] = ..., quotechar: str = ..., quoting: int = ..., doublequote: bool = ..., escapechar: Optiona[str] = ..., comment: Optional[str] = ..., encoding: Optional[str] = ..., dialect: Optional[str] = ..., error_bad_lines: bool = ..., warn_bad_lines: bool = ..., delim_whitespace: bool = ..., low_memory: bool = ..., memory_map: bool = ..., float_precision: Optional[str] = ...) -> DataFrame: ...

# General Functions. Many of these still need argument types added; for now I used Any.

def bdate_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: str = ..., tz: Any = ..., normalize: bool = ..., name: Any = ..., weekmask: Any = ..., holidays: Any = ..., closed: Any = ..., ) -> DatetimeIndex: ...
def concat(dataframes: List[DataFrame], axis: _AxisType = ..., join: str = ..., ignore_index: bool = ..., keys: Optional[Sequence] = ..., levels: Optional[List[Union[int, str]]] = ..., names: Optional[List[str]] = ..., verify_integrity: bool = ..., sort: bool = ..., copy: bool = ...) -> DataFrame: ...
def crosstab(index: Any, columns: Any, values: Any = ..., rownames: Any = ..., colnames: Any = ..., aggfunc: Any = ..., margins: bool = ..., margins_name: str = ..., dropna: bool = ..., normalize: bool = ...) -> DataFrame: ...
def cut(x: _np.ndarray, bins: int, right: bool = ..., labels: Any = ..., retbins: bool = ..., precision: int = ..., include_lowest: bool = ..., duplicates: str = ...) -> Tuple[List, Any]: ...
def date_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: Any = ..., tz: Any = ..., normalize: bool = ..., name: Any = ..., closed: Any = ..., **kwargs) -> DatetimeIndex: ...
def eval(expr: Any, parser: str = ..., engine: Optional[str] = ..., truediv: Any = ..., local_dict: Any = ..., global_dict: Any = ..., resolvers: Any = ..., level: int = ..., target: Any = ..., inplace: bool = ...) -> Any: ...
def get_dummies(data: Any, prefix: Any = ..., prefix_sep: str = ..., dummy_na: bool = ..., columns: Any = ..., sparse: bool = ..., drop_first: bool = ..., dtype: Any = ...) -> DataFrame: ...
def factorize(values: Any, sort: bool = ..., na_sentinel: int = ..., size_hint: Union[int, None] = None) -> Tuple[_np.ndarray, Union[_np.ndarray, ABCIndex]]: ...
def get_dummies(df: Union[DataFrame, Series[_DType]]) -> DataFrame: ...
def infer_freq(index: Any, warn: bool = ...) -> Union[str, None]: ...
def dinterval_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: Any = ..., name: Any = ..., closed: str = ...) -> None: ...
def isna(df: Union[DataFrame, Series[_DType]]) -> _np.ndarray: ...
def isnull(df: Union[DataFrame, Series[_DType]]) -> _np.ndarray: ...
def melt(frame: DataFrame, id_vars: Union[Tuple, List, np.ndarray] = ..., value_vars: Any = ..., var_name: Optional[str] = ..., value_name: str = ..., col_level: Optional[Union[int, str]] = ...) -> DataFrame: ...
@overload
def merge(left: DataFrame, right: DataFrame, on: str = ..., how: str = ...) -> DataFrame: ...
@overload
def merge(left: DataFrame, right: DataFrame, left_on: str, right_on: str, how: str = ...) -> DataFrame: ...
@overload
def merge(left: DataFrame, right: DataFrame, left_on: List[str], right_on: List[str], how: str = ...) -> DataFrame: ...
@overload
def merge(left: DataFrame, right: DataFrame, left_index: bool, right_index: bool, how: str = ...) -> DataFrame: ...
def merge_asof(left: Any, right: Any, on: Any = ..., left_on: Any = ..., right_on: Any = ..., left_index: bool = ..., right_index: bool = ..., by: Any = ..., left_by: Any = ..., right_by: Any = ..., suffixes: Any = ..., tolerance: Any = ..., allow_exact_matches: bool = ..., direction: str = ...) -> DataFrame: ...
def merge_ordered(left: Any, right: Any, on: Any = ..., left_on: Any = ..., right_on: Any = ..., left_by: Any = ..., right_by: Any = ..., fill_method: Any = ..., suffixes=('_x', '_y'), how: str = 'outer') -> DataFrame: ...
def notnull(df: Union[DataFrame, Series[_DType]]) -> _np.ndarray: ...
def period_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: Any = ..., name: Any = ...) -> PeriodIndex: ...
def pivot(data: DataFrame, index: Optional[str] = ..., columns: Optional[str] = ..., values: Optional[Union[str, List[str]] = ...]) -> DataFrame: ...
def pivot_table(data: Any, values: Any = ..., index: Any = ..., columns: Any = ..., aggfunc: str = ..., fill_value: Any = ..., margins: bool = ..., dropna: bool = ..., margins_name: str = ..., observed: bool = ...) -> DataFrame: ...
def qcut(x: Any, q: Any, labels: Any = ..., retbins: bool = ..., precision: int = ..., duplicates: str = ...) -> Tuple[Any, Any]: ...
def timedelta_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: Any = ..., name: Any = ..., closed: Any = ...) -> TimedeltaIndex: ...
def to_datetime(arg: Any, errors: str = ..., dayfirst: bool = ..., yearfirst: bool = ..., utc: Any = ..., format: Any = ..., exact: bool = ..., unit: Any = ..., infer_datetime_format: bool = ..., origin: str = ..., cache: bool = ...) -> None: ...
def to_numeric(arg: Any, errors: str = ..., downcast: Any = ...) -> Any: ...
def to_timedelta(arg: Any, unit: str = ..., errors: str = ...) -> Any: ...
def unique(values: Series[_DType]) -> _np.ndarray: ...
def wide_to_long(df: DataFrame, stubnames: Any, i: Any, j: Any, sep: str = ..., suffix: str = ...) -> DataFrame: ...
