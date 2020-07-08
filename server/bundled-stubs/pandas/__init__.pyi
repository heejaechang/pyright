"""Pandas public API"""

""" 
These stubs are heavily based on Pandas 1.0.3 docs.

Areas that still need a lot of work include Window/Rolling, Resampling
and a lot of time series related APIs.
"""

import sys
from typing import Tuple, List, Union, IO, Iterable, Optional, Any, overload, Callable, Dict, Sequence
if sys.version_info >= (3, 8):
    from typing import Literal, Protocol
else:
    from typing_extensions import Literal, Protocol
from pathlib import Path
import numpy as _np
import datetime as _dt
from . import testing
from .core import DataFrame, Series, Index, DatetimeIndex, PeriodIndex, TimedeltaIndex, _DType

_AxisType = Literal["columns", "index"]
_Path_or_Buf = Union[str, Path, IO]
_Scalar = Union[str, bytes, _dt.date, _dt.datetime, _dt.timedelta, bool, int, float, complex]


class TextParser():
    def read(self) -> DataFrame: ...


class _SupportsRead(Protocol):
    def read(self) -> str: ...


# I/O Functions

def read_clipboard(sep: str = ..., **kwargs) -> DataFrame: ...
@overload
def read_csv(reader: IO, sep: str = ..., delimiter: Optional[str] = ..., header: Union[int, List[int], Literal['infer']] = ..., names: Optional[Sequence[str]] = ..., index_col: Optional[Union[int, str, Sequence, Literal[False]]] = ..., usecols: Optional[Union[int, str, Sequence]] = ..., squeeze: bool = ..., prefix: Optional[str] = ..., mangle_dupe_cols: bool = ..., dtype: Optional[Union[str, Dict[str, Any]]] = ..., engine: Optional[Literal['c', 'python']] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skipinitialspace: bool = ..., skiprows: Optional[Union[Sequence, int, Callable]] = ..., skipfooter: int = ..., nrows: Optional[int] = ..., na_values: Optional[Any] = ..., keep_default_na: bool = ..., na_filter: bool = ..., verbose: bool = ..., skip_blank_lines: bool = ..., parse_dates: bool = ..., infer_datetime_format: bool = ..., keep_date_col: bool = ..., date_parser: Optional[Callable] = ..., dayfirst: bool = ..., cache_dates: bool = ..., iterator: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., thousands: Optional[str] = ..., decimal: Optional[str] = ..., lineterminator: Optional[str] = ..., quotechar: str = ..., quoting: int = ..., doublequote: bool = ..., escapechar: Optional[str] = ..., comment: Optional[str] = ..., encoding: Optional[str] = ..., dialect: Optional[str] = ..., error_bad_lines: bool = ..., warn_bad_lines: bool = ..., delim_whitespace: bool = ..., low_memory: bool = ..., memory_map: bool = ..., float_precision: Optional[str] = ...) -> TextParser:
    '''Read a comma-separated values (csv) file into DataFrame.

Also supports optionally iterating or breaking of the file
into chunks.

Additional help can be found in the online docs for
`IO Tools <https://pandas.pydata.org/pandas-docs/stable/user_guide/io.html>`_.

Parameters
----------
filepath_or_buffer : str, path object or file-like object
    Any valid string path is acceptable. The string could be a URL. Valid
    URL schemes include http, ftp, s3, and file. For file URLs, a host is
    expected. A local file could be: file://localhost/path/to/table.csv.

    If you want to pass in a path object, pandas accepts any ``os.PathLike``.

    By file-like object, we refer to objects with a ``read()`` method, such as
    a file handler (e.g. via builtin ``open`` function) or ``StringIO``.
sep : str, default ','
    Delimiter to use. If sep is None, the C engine cannot automatically detect
    the separator, but the Python parsing engine can, meaning the latter will
    be used and automatically detect the separator by Python's builtin sniffer
    tool, ``csv.Sniffer``. In addition, separators longer than 1 character and
    different from ``'\s+'`` will be interpreted as regular expressions and
    will also force the use of the Python parsing engine. Note that regex
    delimiters are prone to ignoring quoted data. Regex example: ``'\r\t'``.
delimiter : str, default ``None``
    Alias for sep.
header : int, list of int, default 'infer'
    Row number(s) to use as the column names, and the start of the
    data.  Default behavior is to infer the column names: if no names
    are passed the behavior is identical to ``header=0`` and column
    names are inferred from the first line of the file, if column
    names are passed explicitly then the behavior is identical to
    ``header=None``. Explicitly pass ``header=0`` to be able to
    replace existing names. The header can be a list of integers that
    specify row locations for a multi-index on the columns
    e.g. [0,1,3]. Intervening rows that are not specified will be
    skipped (e.g. 2 in this example is skipped). Note that this
    parameter ignores commented lines and empty lines if
    ``skip_blank_lines=True``, so ``header=0`` denotes the first line of
    data rather than the first line of the file.
names : array-like, optional
    List of column names to use. If the file contains a header row,
    then you should explicitly pass ``header=0`` to override the column names.
    Duplicates in this list are not allowed.
index_col : int, str, sequence of int / str, or False, default ``None``
  Column(s) to use as the row labels of the ``DataFrame``, either given as
  string name or column index. If a sequence of int / str is given, a
  MultiIndex is used.

  Note: ``index_col=False`` can be used to force pandas to *not* use the first
  column as the index, e.g. when you have a malformed file with delimiters at
  the end of each line.
usecols : list-like or callable, optional
    Return a subset of the columns. If list-like, all elements must either
    be positional (i.e. integer indices into the document columns) or strings
    that correspond to column names provided either by the user in `names` or
    inferred from the document header row(s). For example, a valid list-like
    `usecols` parameter would be ``[0, 1, 2]`` or ``['foo', 'bar', 'baz']``.
    Element order is ignored, so ``usecols=[0, 1]`` is the same as ``[1, 0]``.
    To instantiate a DataFrame from ``data`` with element order preserved use
    ``pd.read_csv(data, usecols=['foo', 'bar'])[['foo', 'bar']]`` for columns
    in ``['foo', 'bar']`` order or
    ``pd.read_csv(data, usecols=['foo', 'bar'])[['bar', 'foo']]``
    for ``['bar', 'foo']`` order.

    If callable, the callable function will be evaluated against the column
    names, returning names where the callable function evaluates to True. An
    example of a valid callable argument would be ``lambda x: x.upper() in
    ['AAA', 'BBB', 'DDD']``. Using this parameter results in much faster
    parsing time and lower memory usage.
squeeze : bool, default False
    If the parsed data only contains one column then return a Series.
prefix : str, optional
    Prefix to add to column numbers when no header, e.g. 'X' for X0, X1, ...
mangle_dupe_cols : bool, default True
    Duplicate columns will be specified as 'X', 'X.1', ...'X.N', rather than
    'X'...'X'. Passing in False will cause data to be overwritten if there
    are duplicate names in the columns.
dtype : Type name or dict of column -> type, optional
    Data type for data or columns. E.g. {'a': np.float64, 'b': np.int32,
    'c': 'Int64'}
    Use `str` or `object` together with suitable `na_values` settings
    to preserve and not interpret dtype.
    If converters are specified, they will be applied INSTEAD
    of dtype conversion.
engine : {'c', 'python'}, optional
    Parser engine to use. The C engine is faster while the python engine is
    currently more feature-complete.
converters : dict, optional
    Dict of functions for converting values in certain columns. Keys can either
    be integers or column labels.
true_values : list, optional
    Values to consider as True.
false_values : list, optional
    Values to consider as False.
skipinitialspace : bool, default False
    Skip spaces after delimiter.
skiprows : list-like, int or callable, optional
    Line numbers to skip (0-indexed) or number of lines to skip (int)
    at the start of the file.

    If callable, the callable function will be evaluated against the row
    indices, returning True if the row should be skipped and False otherwise.
    An example of a valid callable argument would be ``lambda x: x in [0, 2]``.
skipfooter : int, default 0
    Number of lines at bottom of file to skip (Unsupported with engine='c').
nrows : int, optional
    Number of rows of file to read. Useful for reading pieces of large files.
na_values : scalar, str, list-like, or dict, optional
    Additional strings to recognize as NA/NaN. If dict passed, specific
    per-column NA values.  By default the following values are interpreted as
    NaN: '', '#N/A', '#N/A N/A', '#NA', '-1.#IND', '-1.#QNAN', '-NaN', '-nan',
    '1.#IND', '1.#QNAN', '<NA>', 'N/A', 'NA', 'NULL', 'NaN', 'n/a',
    'nan', 'null'.
keep_default_na : bool, default True
    Whether or not to include the default NaN values when parsing the data.
    Depending on whether `na_values` is passed in, the behavior is as follows:

    * If `keep_default_na` is True, and `na_values` are specified, `na_values`
      is appended to the default NaN values used for parsing.
    * If `keep_default_na` is True, and `na_values` are not specified, only
      the default NaN values are used for parsing.
    * If `keep_default_na` is False, and `na_values` are specified, only
      the NaN values specified `na_values` are used for parsing.
    * If `keep_default_na` is False, and `na_values` are not specified, no
      strings will be parsed as NaN.

    Note that if `na_filter` is passed in as False, the `keep_default_na` and
    `na_values` parameters will be ignored.
na_filter : bool, default True
    Detect missing value markers (empty strings and the value of na_values). In
    data without any NAs, passing na_filter=False can improve the performance
    of reading a large file.
verbose : bool, default False
    Indicate number of NA values placed in non-numeric columns.
skip_blank_lines : bool, default True
    If True, skip over blank lines rather than interpreting as NaN values.
parse_dates : bool or list of int or names or list of lists or dict, default False
    The behavior is as follows:

    * boolean. If True -> try parsing the index.
    * list of int or names. e.g. If [1, 2, 3] -> try parsing columns 1, 2, 3
      each as a separate date column.
    * list of lists. e.g.  If [[1, 3]] -> combine columns 1 and 3 and parse as
      a single date column.
    * dict, e.g. {'foo' : [1, 3]} -> parse columns 1, 3 as date and call
      result 'foo'

    If a column or index cannot be represented as an array of datetimes,
    say because of an unparseable value or a mixture of timezones, the column
    or index will be returned unaltered as an object data type. For
    non-standard datetime parsing, use ``pd.to_datetime`` after
    ``pd.read_csv``. To parse an index or column with a mixture of timezones,
    specify ``date_parser`` to be a partially-applied
    :func:`pandas.to_datetime` with ``utc=True``. See
    :ref:`io.csv.mixed_timezones` for more.

    Note: A fast-path exists for iso8601-formatted dates.
infer_datetime_format : bool, default False
    If True and `parse_dates` is enabled, pandas will attempt to infer the
    format of the datetime strings in the columns, and if it can be inferred,
    switch to a faster method of parsing them. In some cases this can increase
    the parsing speed by 5-10x.
keep_date_col : bool, default False
    If True and `parse_dates` specifies combining multiple columns then
    keep the original columns.
date_parser : function, optional
    Function to use for converting a sequence of string columns to an array of
    datetime instances. The default uses ``dateutil.parser.parser`` to do the
    conversion. Pandas will try to call `date_parser` in three different ways,
    advancing to the next if an exception occurs: 1) Pass one or more arrays
    (as defined by `parse_dates`) as arguments; 2) concatenate (row-wise) the
    string values from the columns defined by `parse_dates` into a single array
    and pass that; and 3) call `date_parser` once for each row using one or
    more strings (corresponding to the columns defined by `parse_dates`) as
    arguments.
dayfirst : bool, default False
    DD/MM format dates, international and European format.
cache_dates : bool, default True
    If True, use a cache of unique, converted dates to apply the datetime
    conversion. May produce significant speed-up when parsing duplicate
    date strings, especially ones with timezone offsets.

    .. versionadded:: 0.25.0
iterator : bool, default False
    Return TextFileReader object for iteration or getting chunks with
    ``get_chunk()``.
chunksize : int, optional
    Return TextFileReader object for iteration.
    See the `IO Tools docs
    <https://pandas.pydata.org/pandas-docs/stable/io.html#io-chunking>`_
    for more information on ``iterator`` and ``chunksize``.
compression : {'infer', 'gzip', 'bz2', 'zip', 'xz', None}, default 'infer'
    For on-the-fly decompression of on-disk data. If 'infer' and
    `filepath_or_buffer` is path-like, then detect compression from the
    following extensions: '.gz', '.bz2', '.zip', or '.xz' (otherwise no
    decompression). If using 'zip', the ZIP file must contain only one data
    file to be read in. Set to None for no decompression.
thousands : str, optional
    Thousands separator.
decimal : str, default '.'
    Character to recognize as decimal point (e.g. use ',' for European data).
lineterminator : str (length 1), optional
    Character to break file into lines. Only valid with C parser.
quotechar : str (length 1), optional
    The character used to denote the start and end of a quoted item. Quoted
    items can include the delimiter and it will be ignored.
quoting : int or csv.QUOTE_* instance, default 0
    Control field quoting behavior per ``csv.QUOTE_*`` constants. Use one of
    QUOTE_MINIMAL (0), QUOTE_ALL (1), QUOTE_NONNUMERIC (2) or QUOTE_NONE (3).
doublequote : bool, default ``True``
   When quotechar is specified and quoting is not ``QUOTE_NONE``, indicate
   whether or not to interpret two consecutive quotechar elements INSIDE a
   field as a single ``quotechar`` element.
escapechar : str (length 1), optional
    One-character string used to escape other characters.
comment : str, optional
    Indicates remainder of line should not be parsed. If found at the beginning
    of a line, the line will be ignored altogether. This parameter must be a
    single character. Like empty lines (as long as ``skip_blank_lines=True``),
    fully commented lines are ignored by the parameter `header` but not by
    `skiprows`. For example, if ``comment='#'``, parsing
    ``#empty\na,b,c\n1,2,3`` with ``header=0`` will result in 'a,b,c' being
    treated as the header.
encoding : str, optional
    Encoding to use for UTF when reading/writing (ex. 'utf-8'). `List of Python
    standard encodings
    <https://docs.python.org/3/library/codecs.html#standard-encodings>`_ .
dialect : str or csv.Dialect, optional
    If provided, this parameter will override values (default or not) for the
    following parameters: `delimiter`, `doublequote`, `escapechar`,
    `skipinitialspace`, `quotechar`, and `quoting`. If it is necessary to
    override values, a ParserWarning will be issued. See csv.Dialect
    documentation for more details.
error_bad_lines : bool, default True
    Lines with too many fields (e.g. a csv line with too many commas) will by
    default cause an exception to be raised, and no DataFrame will be returned.
    If False, then these "bad lines" will dropped from the DataFrame that is
    returned.
warn_bad_lines : bool, default True
    If error_bad_lines is False, and warn_bad_lines is True, a warning for each
    "bad line" will be output.
delim_whitespace : bool, default False
    Specifies whether or not whitespace (e.g. ``' '`` or ``'	'``) will be
    used as the sep. Equivalent to setting ``sep='\s+'``. If this option
    is set to True, nothing should be passed in for the ``delimiter``
    parameter.
low_memory : bool, default True
    Internally process the file in chunks, resulting in lower memory use
    while parsing, but possibly mixed type inference.  To ensure no mixed
    types either set False, or specify the type with the `dtype` parameter.
    Note that the entire file is read into a single DataFrame regardless,
    use the `chunksize` or `iterator` parameter to return the data in chunks.
    (Only valid with C parser).
memory_map : bool, default False
    If a filepath is provided for `filepath_or_buffer`, map the file object
    directly onto memory and access the data directly from there. Using this
    option can improve performance because there is no longer any I/O overhead.
float_precision : str, optional
    Specifies which converter the C engine should use for floating-point
    values. The options are `None` for the ordinary converter,
    `high` for the high-precision converter, and `round_trip` for the
    round-trip converter.

Returns
-------
DataFrame or TextParser
    A comma-separated values (csv) file is returned as two-dimensional
    data structure with labeled axes.

See Also
--------
to_csv : Write DataFrame to a comma-separated values (csv) file.
read_csv : Read a comma-separated values (csv) file into DataFrame.
read_fwf : Read a table of fixed-width formatted lines into DataFrame.

Examples
--------
>>> pd.read_csv('data.csv')  # doctest: +SKIP
'''
    pass
@overload
def read_csv(filepath: Union[str, Path], sep: str = ..., delimiter: Optional[str] = ..., header: Union[int, List[int], Literal['infer']] = ..., names: Optional[Sequence[str]] = ..., index_col: Optional[Union[int, str, Sequence, Literal[False]]] = ..., usecols: Optional[Union[int, str, Sequence]] = ..., squeeze: bool = ..., prefix: Optional[str] = ..., mangle_dupe_cols: bool = ..., dtype: Optional[Union[str, Dict[str, Any]]] = ..., engine: Optional[Literal['c', 'python']] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skipinitialspace: bool = ..., skiprows: Optional[Union[Sequence, int, Callable]] = ..., skipfooter: int = ..., nrows: Optional[int] = ..., na_values: Optional[Any] = ..., keep_default_na: bool = ..., na_filter: bool = ..., verbose: bool = ..., skip_blank_lines: bool = ..., parse_dates: bool = ..., infer_datetime_format: bool = ..., keep_date_col: bool = ..., date_parser: Optional[Callable] = ..., dayfirst: bool = ..., cache_dates: bool = ..., iterator: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., thousands: Optional[str] = ..., decimal: Optional[str] = ..., lineterminator: Optional[str] = ..., quotechar: str = ..., quoting: int = ..., doublequote: bool = ..., escapechar: Optional[str] = ..., comment: Optional[str] = ..., encoding: Optional[str] = ..., dialect: Optional[str] = ..., error_bad_lines: bool = ..., warn_bad_lines: bool = ..., delim_whitespace: bool = ..., low_memory: bool = ..., memory_map: bool = ..., float_precision: Optional[str] = ...) -> DataFrame: ...
@overload
def read_excel(filepath: str, sheet_name: Optional[List[Union[int, str]]], header: Union[int, List[int]] = ..., names: Optional[List[str]] = ..., index_col: Optional[Union[int, Sequence[int]]] = ..., usecols: Optional[Union[int, str, Sequence[Union[int, str, Callable]]]] = ..., squeeze: bool = ..., dtype: Union[str, Dict[str, Any]] = ..., engine: Optional[str] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skiprows: Optional[List[int]] = ..., nrows: Optional[int] = ..., na_values: Any = ..., keep_default_na: bool = ..., verbose: bool = ..., parse_dates: Union[bool, List, Dict[str, List]] = ..., date_parser: Optional[Callable] = ..., thousands: Optional[str] = ..., comment: Optional[str] = ..., skipfooter: int = ..., convert_float: bool = ..., mangle_dupe_cols: bool = ..., ) -> Dict[Union[int, str], DataFrame]:
    '''
Read an Excel file into a pandas DataFrame.

Supports `xls`, `xlsx`, `xlsm`, `xlsb`, and `odf` file extensions
read from a local filesystem or URL. Supports an option to read
a single sheet or a list of sheets.

Parameters
----------
io : str, bytes, ExcelFile, xlrd.Book, path object, or file-like object
    Any valid string path is acceptable. The string could be a URL. Valid
    URL schemes include http, ftp, s3, and file. For file URLs, a host is
    expected. A local file could be: ``file://localhost/path/to/table.xlsx``.

    If you want to pass in a path object, pandas accepts any ``os.PathLike``.

    By file-like object, we refer to objects with a ``read()`` method,
    such as a file handler (e.g. via builtin ``open`` function)
    or ``StringIO``.
sheet_name : str, int, list, or None, default 0
    Strings are used for sheet names. Integers are used in zero-indexed
    sheet positions. Lists of strings/integers are used to request
    multiple sheets. Specify None to get all sheets.

    Available cases:

    * Defaults to ``0``: 1st sheet as a `DataFrame`
    * ``1``: 2nd sheet as a `DataFrame`
    * ``"Sheet1"``: Load sheet with name "Sheet1"
    * ``[0, 1, "Sheet5"]``: Load first, second and sheet named "Sheet5"
      as a dict of `DataFrame`
    * None: All sheets.

header : int, list of int, default 0
    Row (0-indexed) to use for the column labels of the parsed
    DataFrame. If a list of integers is passed those row positions will
    be combined into a ``MultiIndex``. Use None if there is no header.
names : array-like, default None
    List of column names to use. If file contains no header row,
    then you should explicitly pass header=None.
index_col : int, list of int, default None
    Column (0-indexed) to use as the row labels of the DataFrame.
    Pass None if there is no such column.  If a list is passed,
    those columns will be combined into a ``MultiIndex``.  If a
    subset of data is selected with ``usecols``, index_col
    is based on the subset.
usecols : int, str, list-like, or callable default None
    * If None, then parse all columns.
    * If str, then indicates comma separated list of Excel column letters
      and column ranges (e.g. "A:E" or "A,C,E:F"). Ranges are inclusive of
      both sides.
    * If list of int, then indicates list of column numbers to be parsed.
    * If list of string, then indicates list of column names to be parsed.

      .. versionadded:: 0.24.0

    * If callable, then evaluate each column name against it and parse the
      column if the callable returns ``True``.

    Returns a subset of the columns according to behavior above.

      .. versionadded:: 0.24.0

squeeze : bool, default False
    If the parsed data only contains one column then return a Series.
dtype : Type name or dict of column -> type, default None
    Data type for data or columns. E.g. {'a': np.float64, 'b': np.int32}
    Use `object` to preserve data as stored in Excel and not interpret dtype.
    If converters are specified, they will be applied INSTEAD
    of dtype conversion.
engine : str, default None
    If io is not a buffer or path, this must be set to identify io.
    Acceptable values are None, "xlrd", "openpyxl" or "odf".
converters : dict, default None
    Dict of functions for converting values in certain columns. Keys can
    either be integers or column labels, values are functions that take one
    input argument, the Excel cell content, and return the transformed
    content.
true_values : list, default None
    Values to consider as True.
false_values : list, default None
    Values to consider as False.
skiprows : list-like
    Rows to skip at the beginning (0-indexed).
nrows : int, default None
    Number of rows to parse.

    .. versionadded:: 0.23.0

na_values : scalar, str, list-like, or dict, default None
    Additional strings to recognize as NA/NaN. If dict passed, specific
    per-column NA values. By default the following values are interpreted
    as NaN: '', '#N/A', '#N/A N/A', '#NA', '-1.#IND', '-1.#QNAN', '-NaN', '-nan',
    '1.#IND', '1.#QNAN', '<NA>', 'N/A', 'NA', 'NULL', 'NaN', 'n/a',
    'nan', 'null'.
keep_default_na : bool, default True
    Whether or not to include the default NaN values when parsing the data.
    Depending on whether `na_values` is passed in, the behavior is as follows:

    * If `keep_default_na` is True, and `na_values` are specified, `na_values`
      is appended to the default NaN values used for parsing.
    * If `keep_default_na` is True, and `na_values` are not specified, only
      the default NaN values are used for parsing.
    * If `keep_default_na` is False, and `na_values` are specified, only
      the NaN values specified `na_values` are used for parsing.
    * If `keep_default_na` is False, and `na_values` are not specified, no
      strings will be parsed as NaN.

    Note that if `na_filter` is passed in as False, the `keep_default_na` and
    `na_values` parameters will be ignored.
na_filter : bool, default True
    Detect missing value markers (empty strings and the value of na_values). In
    data without any NAs, passing na_filter=False can improve the performance
    of reading a large file.
verbose : bool, default False
    Indicate number of NA values placed in non-numeric columns.
parse_dates : bool, list-like, or dict, default False
    The behavior is as follows:

    * bool. If True -> try parsing the index.
    * list of int or names. e.g. If [1, 2, 3] -> try parsing columns 1, 2, 3
      each as a separate date column.
    * list of lists. e.g.  If [[1, 3]] -> combine columns 1 and 3 and parse as
      a single date column.
    * dict, e.g. {'foo' : [1, 3]} -> parse columns 1, 3 as date and call
      result 'foo'

    If a column or index contains an unparseable date, the entire column or
    index will be returned unaltered as an object data type. If you don`t want to
    parse some cells as date just change their type in Excel to "Text".
    For non-standard datetime parsing, use ``pd.to_datetime`` after ``pd.read_excel``.

    Note: A fast-path exists for iso8601-formatted dates.
date_parser : function, optional
    Function to use for converting a sequence of string columns to an array of
    datetime instances. The default uses ``dateutil.parser.parser`` to do the
    conversion. Pandas will try to call `date_parser` in three different ways,
    advancing to the next if an exception occurs: 1) Pass one or more arrays
    (as defined by `parse_dates`) as arguments; 2) concatenate (row-wise) the
    string values from the columns defined by `parse_dates` into a single array
    and pass that; and 3) call `date_parser` once for each row using one or
    more strings (corresponding to the columns defined by `parse_dates`) as
    arguments.
thousands : str, default None
    Thousands separator for parsing string columns to numeric.  Note that
    this parameter is only necessary for columns stored as TEXT in Excel,
    any numeric columns will automatically be parsed, regardless of display
    format.
comment : str, default None
    Comments out remainder of line. Pass a character or characters to this
    argument to indicate comments in the input file. Any data between the
    comment string and the end of the current line is ignored.
skipfooter : int, default 0
    Rows at the end to skip (0-indexed).
convert_float : bool, default True
    Convert integral floats to int (i.e., 1.0 --> 1). If False, all numeric
    data will be read in as floats: Excel stores all numbers as floats
    internally.
mangle_dupe_cols : bool, default True
    Duplicate columns will be specified as 'X', 'X.1', ...'X.N', rather than
    'X'...'X'. Passing in False will cause data to be overwritten if there
    are duplicate names in the columns.
**kwds : optional
        Optional keyword arguments can be passed to ``TextFileReader``.

Returns
-------
DataFrame or dict of DataFrames
    DataFrame from the passed in Excel file. See notes in sheet_name
    argument for more information on when a dict of DataFrames is returned.

See Also
--------
to_excel : Write DataFrame to an Excel file.
to_csv : Write DataFrame to a comma-separated values (csv) file.
read_csv : Read a comma-separated values (csv) file into DataFrame.
read_fwf : Read a table of fixed-width formatted lines into DataFrame.

Examples
--------
The file can be read using the file name as string or an open file object:

>>> pd.read_excel('tmp.xlsx', index_col=0)  # doctest: +SKIP
       Name  Value
0   string1      1
1   string2      2
2  #Comment      3

>>> pd.read_excel(open('tmp.xlsx', 'rb'),
...               sheet_name='Sheet3')  # doctest: +SKIP
   Unnamed: 0      Name  Value
0           0   string1      1
1           1   string2      2
2           2  #Comment      3

Index and header can be specified via the `index_col` and `header` arguments

>>> pd.read_excel('tmp.xlsx', index_col=None, header=None)  # doctest: +SKIP
     0         1      2
0  NaN      Name  Value
1  0.0   string1      1
2  1.0   string2      2
3  2.0  #Comment      3

Column types are inferred but can be explicitly specified

>>> pd.read_excel('tmp.xlsx', index_col=0,
...               dtype={'Name': str, 'Value': float})  # doctest: +SKIP
       Name  Value
0   string1    1.0
1   string2    2.0
2  #Comment    3.0

True, False, and NA values, and thousands separators have defaults,
but can be explicitly specified, too. Supply the values you would like
as strings or lists of strings!

>>> pd.read_excel('tmp.xlsx', index_col=0,
...               na_values=['string1', 'string2'])  # doctest: +SKIP
       Name  Value
0       NaN      1
1       NaN      2
2  #Comment      3

Comment lines in the excel input file can be skipped using the `comment` kwarg

>>> pd.read_excel('tmp.xlsx', index_col=0, comment='#')  # doctest: +SKIP
      Name  Value
0  string1    1.0
1  string2    2.0
2     None    NaN
'''
    pass
@overload
def read_excel(filepath: str, sheet_name: Union[int, str] = ..., header: Union[int, List[int]] = ..., names: Optional[List[str]] = ..., index_col: Optional[Union[int, Sequence[int]]] = ..., usecols: Optional[Union[int, str, Sequence[Union[int, str, Callable]]]] = ..., squeeze: bool = ..., dtype: Union[str, Dict[str, Any]] = ..., engine: Optional[str] = ..., converters: Optional[Dict[Union[int, str], Callable]]= ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skiprows: Optional[List[int]] = ..., nrows: Optional[int] = ..., na_values: Any = ..., keep_default_na: bool = ..., verbose: bool = ..., parse_dates: Union[bool, List, Dict[str, List]] = ..., date_parser: Optional[Callable] = ..., thousands: Optional[str] = ..., comment: Optional[str] = ..., skipfooter: int = ..., convert_float: bool = ..., mangle_dupe_cols: bool = ..., **kwargs) -> DataFrame: ...
def read_feather(p: Union[str, Path, IO], columns: Optional[Sequence] = ..., use_threads: bool = ...) -> Any: ...
@overload
def read_fwf(filepath: Union[str, Path], colspecs:Union[List[Tuple[int, int]], Literal['infer']] = ..., widths: Optional[List[int]] = ..., infer_nrows: int = ...,) -> DataFrame: ...
@overload
def read_fwf(reader: IO, colspecs:Union[List[Tuple[int, int]], Literal['infer']] = ..., widths: Optional[List[int]] = ..., infer_nrows: int = ...,) -> TextParser: ...
def read_hdf(path_or_buf: Union[str, Path, IO], key: Any = ..., mode: str = ..., errors: str = ..., where: Optional[List[Any]] = ..., start: Optional[int] = ..., stop: Optional[int] = ..., columns: Optional[List[str]] = ..., iterator: bool = ..., chunksize: Optional[int] = ..., **kwargs) -> Any: ...
def read_html(io: Union[str, Path, IO], match: str = ..., flavor: Optional[str] = ..., header: Optional[Union[int, List[int]]] = ..., index_col: Optional[Union[int, Sequence]] = ..., skiprows: Optional[Union[int, Sequence, slice]] = ..., attrs: Optional[Dict[str, str]] = ..., parse_dates: bool = ..., thousands: str = ..., encoding: Optional[str] = ..., decimal: str = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., na_values: Optional[Iterable] = ..., keep_default_na: bool = ..., displayed_only: bool = ...) -> List[DataFrame]: ...
@overload
def read_json(path: Union[str, Path, IO], orient: Optional[str] = ..., dtype: Any = ..., convert_axes: Any = ..., convert_dates: bool = ..., keep_default_dates: bool = ..., numpy: bool = ..., precise_float: bool = ..., date_unit: Optional[str] = ..., encoding: Optional[str] = ..., lines: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., *, typ: Literal['series']) -> Series: ...
@overload
def read_json(path: Union[str, Path, IO], orient: Optional[str] = ..., dtype: Any = ..., convert_axes: Any = ..., convert_dates: bool = ..., keep_default_dates: bool = ..., numpy: bool = ..., precise_float: bool = ..., date_unit: Optional[str] = ..., encoding: Optional[str] = ..., lines: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., *, typ: Literal['frame']) -> DataFrame: ...
@overload
def read_json(path: Union[str, Path, IO], orient: Optional[str] = ..., typ: Optional[Literal['frame', 'series']] = ..., dtype: Any = ..., convert_axes: Any = ..., convert_dates: bool = ..., keep_default_dates: bool = ..., numpy: bool = ..., precise_float: bool = ..., date_unit: Optional[str] = ..., encoding: Optional[str] = ..., lines: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ...) -> Union[Series, DataFrame]: ...
def read_orc(path: Union[str, Path, IO], columns: Optional[List[str]] = ..., **kwargs) -> DataFrame: ...
def read_pickle(filepath_or_buffer_or_reader: _Path_or_Buf, compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ...) -> Any: ...
def read_parquet(path: Union[str, Path, IO], engine: str = ..., columns: Optional[List[str]] = ..., **kwargs) -> DataFrame: ...
def read_sas(path: Union[str, Path, IO], format: Optional[str] = ..., index: Optional[List[Any]] = ..., encoding: Optional[str] = ..., chunksize: Optional[int] = ..., iterator: bool = ...) -> Any: ...
def read_spss(path: Union[str, Path, IO], usecols: Optional[Sequence[str]] = ..., convert_categoricals: bool = ...) -> DataFrame: ...
def read_sql(sql: Union[str, Any], con: Union[str, Any] = ..., index_col: Optional[Union[str, List[str]]] = ..., coerce_float: bool = ..., params: Optional[Union[List[str], Tuple[str, ...], Dict[str, str]]] = ..., parse_dates: Optional[Union[List[str], Dict[str, str], Dict[str, Dict[str, Any]]]] = ..., columns: List[str] = ..., chunksize: int = ...,) -> DataFrame: ...
def read_sql_query(sql: Any, con: Any, schema: Optional[str] = ..., index_col: Optional[Union[str, List[str]]] = ..., coerce_float: bool = ..., params: Any = ..., parse_dates: Optional[Union[List[str], Dict[str, str]]] = ..., chunksize: Optional[int] = ...) -> DataFrame: ...
def read_sql_table(table_name: str, con: Any, schema: Optional[str] = ..., index_col: Optional[Union[str, List[str]]] = ..., coerce_float: bool = ..., parse_dates: Optional[Union[List[str], Dict[str, str]]] = ..., columns: Optional[List[str]] = ..., chunksize: Optional[int] = ...) -> DataFrame: ...
def read_stata(path: Union[str, Path, IO], convert_dates: bool = ..., convert_categoricals: bool = ..., index_col: Optional[str] = ..., convert_missing: bool = ..., preserve_dtypes: bool = ..., columns: Optional[List[str]] = ..., order_categoricals: bool = ..., chunksize: Optional[int] = ..., iterator: bool = ...) -> DataFrame:
    '''Read Stata file into DataFrame.

Parameters
----------
filepath_or_buffer : str, path object or file-like object
    Any valid string path is acceptable. The string could be a URL. Valid
    URL schemes include http, ftp, s3, and file. For file URLs, a host is
    expected. A local file could be: ``file://localhost/path/to/table.dta``.

    If you want to pass in a path object, pandas accepts any ``os.PathLike``.

    By file-like object, we refer to objects with a ``read()`` method,
    such as a file handler (e.g. via builtin ``open`` function)
    or ``StringIO``.
convert_dates : bool, default True
    Convert date variables to DataFrame time values.
convert_categoricals : bool, default True
    Read value labels and convert columns to Categorical/Factor variables.
index_col : str, optional
    Column to set as index.
convert_missing : bool, default False
    Flag indicating whether to convert missing values to their Stata
    representations.  If False, missing values are replaced with nan.
    If True, columns containing missing values are returned with
    object data types and missing values are represented by
    StataMissingValue objects.
preserve_dtypes : bool, default True
    Preserve Stata datatypes. If False, numeric data are upcast to pandas
    default types for foreign data (float64 or int64).
columns : list or None
    Columns to retain.  Columns will be returned in the given order.  None
    returns all columns.
order_categoricals : bool, default True
    Flag indicating whether converted categorical data are ordered.
chunksize : int, default None
    Return StataReader object for iterations, returns chunks with
    given number of lines.
iterator : bool, default False
    Return StataReader object.

Returns
-------
DataFrame or StataReader

See Also
--------
io.stata.StataReader : Low-level reader for Stata data files.
DataFrame.to_stata: Export Stata data files.

Examples
--------
Read a Stata dta file:

>>> df = pd.read_stata('filename.dta')

Read a Stata dta file in 10,000 line chunks:

>>> itr = pd.read_stata('filename.dta', chunksize=10000)
>>> for chunk in itr:
...     do_something(chunk)
'''
    pass
@overload
def read_table(reader: IO, sep: str = ..., delimiter: Optional[str] = ..., header: Union[int, List[int], Literal['infer']] = ..., names: Optional[Sequence[str]] = ..., index_col: Optional[Union[int, str, Sequence, Literal[False]]] = ..., usecols: Optional[Union[int, str, Sequence]] = ..., squeeze: bool = ..., prefix: Optional[str] = ..., mangle_dupe_cols: bool = ..., dtype: Optional[Union[str, Dict[str, Any]]] = ..., engine: Optional[Literal['c', 'python']] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skipinitialspace: bool = ..., skiprows: Optional[Union[Sequence, int, Callable]] = ..., skipfooter: int = ..., nrows: Optional[int] = ..., na_values: Optional[Any] = ..., keep_default_na: bool = ..., na_filter: bool = ..., verbose: bool = ..., skip_blank_lines: bool = ..., parse_dates: bool = ..., infer_datetime_format: bool = ..., keep_date_col: bool = ..., date_parser: Optional[Callable] = ..., dayfirst: bool = ..., cache_dates: bool = ..., iterator: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., thousands: Optional[str] = ..., decimal: Optional[str] = ..., lineterminator: Optional[str] = ..., quotechar: str = ..., quoting: int = ..., doublequote: bool = ..., escapechar: Optional[str] = ..., comment: Optional[str] = ..., encoding: Optional[str] = ..., dialect: Optional[str] = ..., error_bad_lines: bool = ..., warn_bad_lines: bool = ..., delim_whitespace: bool = ..., low_memory: bool = ..., memory_map: bool = ..., float_precision: Optional[str] = ...) -> TextParser:
    '''Read general delimited file into DataFrame.

Also supports optionally iterating or breaking of the file
into chunks.

Additional help can be found in the online docs for
`IO Tools <https://pandas.pydata.org/pandas-docs/stable/user_guide/io.html>`_.

Parameters
----------
filepath_or_buffer : str, path object or file-like object
    Any valid string path is acceptable. The string could be a URL. Valid
    URL schemes include http, ftp, s3, and file. For file URLs, a host is
    expected. A local file could be: file://localhost/path/to/table.csv.

    If you want to pass in a path object, pandas accepts any ``os.PathLike``.

    By file-like object, we refer to objects with a ``read()`` method, such as
    a file handler (e.g. via builtin ``open`` function) or ``StringIO``.
sep : str, default '\\t' (tab-stop)
    Delimiter to use. If sep is None, the C engine cannot automatically detect
    the separator, but the Python parsing engine can, meaning the latter will
    be used and automatically detect the separator by Python's builtin sniffer
    tool, ``csv.Sniffer``. In addition, separators longer than 1 character and
    different from ``'\s+'`` will be interpreted as regular expressions and
    will also force the use of the Python parsing engine. Note that regex
    delimiters are prone to ignoring quoted data. Regex example: ``'\r\t'``.
delimiter : str, default ``None``
    Alias for sep.
header : int, list of int, default 'infer'
    Row number(s) to use as the column names, and the start of the
    data.  Default behavior is to infer the column names: if no names
    are passed the behavior is identical to ``header=0`` and column
    names are inferred from the first line of the file, if column
    names are passed explicitly then the behavior is identical to
    ``header=None``. Explicitly pass ``header=0`` to be able to
    replace existing names. The header can be a list of integers that
    specify row locations for a multi-index on the columns
    e.g. [0,1,3]. Intervening rows that are not specified will be
    skipped (e.g. 2 in this example is skipped). Note that this
    parameter ignores commented lines and empty lines if
    ``skip_blank_lines=True``, so ``header=0`` denotes the first line of
    data rather than the first line of the file.
names : array-like, optional
    List of column names to use. If the file contains a header row,
    then you should explicitly pass ``header=0`` to override the column names.
    Duplicates in this list are not allowed.
index_col : int, str, sequence of int / str, or False, default ``None``
  Column(s) to use as the row labels of the ``DataFrame``, either given as
  string name or column index. If a sequence of int / str is given, a
  MultiIndex is used.

  Note: ``index_col=False`` can be used to force pandas to *not* use the first
  column as the index, e.g. when you have a malformed file with delimiters at
  the end of each line.
usecols : list-like or callable, optional
    Return a subset of the columns. If list-like, all elements must either
    be positional (i.e. integer indices into the document columns) or strings
    that correspond to column names provided either by the user in `names` or
    inferred from the document header row(s). For example, a valid list-like
    `usecols` parameter would be ``[0, 1, 2]`` or ``['foo', 'bar', 'baz']``.
    Element order is ignored, so ``usecols=[0, 1]`` is the same as ``[1, 0]``.
    To instantiate a DataFrame from ``data`` with element order preserved use
    ``pd.read_csv(data, usecols=['foo', 'bar'])[['foo', 'bar']]`` for columns
    in ``['foo', 'bar']`` order or
    ``pd.read_csv(data, usecols=['foo', 'bar'])[['bar', 'foo']]``
    for ``['bar', 'foo']`` order.

    If callable, the callable function will be evaluated against the column
    names, returning names where the callable function evaluates to True. An
    example of a valid callable argument would be ``lambda x: x.upper() in
    ['AAA', 'BBB', 'DDD']``. Using this parameter results in much faster
    parsing time and lower memory usage.
squeeze : bool, default False
    If the parsed data only contains one column then return a Series.
prefix : str, optional
    Prefix to add to column numbers when no header, e.g. 'X' for X0, X1, ...
mangle_dupe_cols : bool, default True
    Duplicate columns will be specified as 'X', 'X.1', ...'X.N', rather than
    'X'...'X'. Passing in False will cause data to be overwritten if there
    are duplicate names in the columns.
dtype : Type name or dict of column -> type, optional
    Data type for data or columns. E.g. {'a': np.float64, 'b': np.int32,
    'c': 'Int64'}
    Use `str` or `object` together with suitable `na_values` settings
    to preserve and not interpret dtype.
    If converters are specified, they will be applied INSTEAD
    of dtype conversion.
engine : {'c', 'python'}, optional
    Parser engine to use. The C engine is faster while the python engine is
    currently more feature-complete.
converters : dict, optional
    Dict of functions for converting values in certain columns. Keys can either
    be integers or column labels.
true_values : list, optional
    Values to consider as True.
false_values : list, optional
    Values to consider as False.
skipinitialspace : bool, default False
    Skip spaces after delimiter.
skiprows : list-like, int or callable, optional
    Line numbers to skip (0-indexed) or number of lines to skip (int)
    at the start of the file.

    If callable, the callable function will be evaluated against the row
    indices, returning True if the row should be skipped and False otherwise.
    An example of a valid callable argument would be ``lambda x: x in [0, 2]``.
skipfooter : int, default 0
    Number of lines at bottom of file to skip (Unsupported with engine='c').
nrows : int, optional
    Number of rows of file to read. Useful for reading pieces of large files.
na_values : scalar, str, list-like, or dict, optional
    Additional strings to recognize as NA/NaN. If dict passed, specific
    per-column NA values.  By default the following values are interpreted as
    NaN: '', '#N/A', '#N/A N/A', '#NA', '-1.#IND', '-1.#QNAN', '-NaN', '-nan',
    '1.#IND', '1.#QNAN', '<NA>', 'N/A', 'NA', 'NULL', 'NaN', 'n/a',
    'nan', 'null'.
keep_default_na : bool, default True
    Whether or not to include the default NaN values when parsing the data.
    Depending on whether `na_values` is passed in, the behavior is as follows:

    * If `keep_default_na` is True, and `na_values` are specified, `na_values`
      is appended to the default NaN values used for parsing.
    * If `keep_default_na` is True, and `na_values` are not specified, only
      the default NaN values are used for parsing.
    * If `keep_default_na` is False, and `na_values` are specified, only
      the NaN values specified `na_values` are used for parsing.
    * If `keep_default_na` is False, and `na_values` are not specified, no
      strings will be parsed as NaN.

    Note that if `na_filter` is passed in as False, the `keep_default_na` and
    `na_values` parameters will be ignored.
na_filter : bool, default True
    Detect missing value markers (empty strings and the value of na_values). In
    data without any NAs, passing na_filter=False can improve the performance
    of reading a large file.
verbose : bool, default False
    Indicate number of NA values placed in non-numeric columns.
skip_blank_lines : bool, default True
    If True, skip over blank lines rather than interpreting as NaN values.
parse_dates : bool or list of int or names or list of lists or dict, default False
    The behavior is as follows:

    * boolean. If True -> try parsing the index.
    * list of int or names. e.g. If [1, 2, 3] -> try parsing columns 1, 2, 3
      each as a separate date column.
    * list of lists. e.g.  If [[1, 3]] -> combine columns 1 and 3 and parse as
      a single date column.
    * dict, e.g. {'foo' : [1, 3]} -> parse columns 1, 3 as date and call
      result 'foo'

    If a column or index cannot be represented as an array of datetimes,
    say because of an unparseable value or a mixture of timezones, the column
    or index will be returned unaltered as an object data type. For
    non-standard datetime parsing, use ``pd.to_datetime`` after
    ``pd.read_csv``. To parse an index or column with a mixture of timezones,
    specify ``date_parser`` to be a partially-applied
    :func:`pandas.to_datetime` with ``utc=True``. See
    :ref:`io.csv.mixed_timezones` for more.

    Note: A fast-path exists for iso8601-formatted dates.
infer_datetime_format : bool, default False
    If True and `parse_dates` is enabled, pandas will attempt to infer the
    format of the datetime strings in the columns, and if it can be inferred,
    switch to a faster method of parsing them. In some cases this can increase
    the parsing speed by 5-10x.
keep_date_col : bool, default False
    If True and `parse_dates` specifies combining multiple columns then
    keep the original columns.
date_parser : function, optional
    Function to use for converting a sequence of string columns to an array of
    datetime instances. The default uses ``dateutil.parser.parser`` to do the
    conversion. Pandas will try to call `date_parser` in three different ways,
    advancing to the next if an exception occurs: 1) Pass one or more arrays
    (as defined by `parse_dates`) as arguments; 2) concatenate (row-wise) the
    string values from the columns defined by `parse_dates` into a single array
    and pass that; and 3) call `date_parser` once for each row using one or
    more strings (corresponding to the columns defined by `parse_dates`) as
    arguments.
dayfirst : bool, default False
    DD/MM format dates, international and European format.
cache_dates : bool, default True
    If True, use a cache of unique, converted dates to apply the datetime
    conversion. May produce significant speed-up when parsing duplicate
    date strings, especially ones with timezone offsets.

    .. versionadded:: 0.25.0
iterator : bool, default False
    Return TextFileReader object for iteration or getting chunks with
    ``get_chunk()``.
chunksize : int, optional
    Return TextFileReader object for iteration.
    See the `IO Tools docs
    <https://pandas.pydata.org/pandas-docs/stable/io.html#io-chunking>`_
    for more information on ``iterator`` and ``chunksize``.
compression : {'infer', 'gzip', 'bz2', 'zip', 'xz', None}, default 'infer'
    For on-the-fly decompression of on-disk data. If 'infer' and
    `filepath_or_buffer` is path-like, then detect compression from the
    following extensions: '.gz', '.bz2', '.zip', or '.xz' (otherwise no
    decompression). If using 'zip', the ZIP file must contain only one data
    file to be read in. Set to None for no decompression.
thousands : str, optional
    Thousands separator.
decimal : str, default '.'
    Character to recognize as decimal point (e.g. use ',' for European data).
lineterminator : str (length 1), optional
    Character to break file into lines. Only valid with C parser.
quotechar : str (length 1), optional
    The character used to denote the start and end of a quoted item. Quoted
    items can include the delimiter and it will be ignored.
quoting : int or csv.QUOTE_* instance, default 0
    Control field quoting behavior per ``csv.QUOTE_*`` constants. Use one of
    QUOTE_MINIMAL (0), QUOTE_ALL (1), QUOTE_NONNUMERIC (2) or QUOTE_NONE (3).
doublequote : bool, default ``True``
   When quotechar is specified and quoting is not ``QUOTE_NONE``, indicate
   whether or not to interpret two consecutive quotechar elements INSIDE a
   field as a single ``quotechar`` element.
escapechar : str (length 1), optional
    One-character string used to escape other characters.
comment : str, optional
    Indicates remainder of line should not be parsed. If found at the beginning
    of a line, the line will be ignored altogether. This parameter must be a
    single character. Like empty lines (as long as ``skip_blank_lines=True``),
    fully commented lines are ignored by the parameter `header` but not by
    `skiprows`. For example, if ``comment='#'``, parsing
    ``#empty\na,b,c\n1,2,3`` with ``header=0`` will result in 'a,b,c' being
    treated as the header.
encoding : str, optional
    Encoding to use for UTF when reading/writing (ex. 'utf-8'). `List of Python
    standard encodings
    <https://docs.python.org/3/library/codecs.html#standard-encodings>`_ .
dialect : str or csv.Dialect, optional
    If provided, this parameter will override values (default or not) for the
    following parameters: `delimiter`, `doublequote`, `escapechar`,
    `skipinitialspace`, `quotechar`, and `quoting`. If it is necessary to
    override values, a ParserWarning will be issued. See csv.Dialect
    documentation for more details.
error_bad_lines : bool, default True
    Lines with too many fields (e.g. a csv line with too many commas) will by
    default cause an exception to be raised, and no DataFrame will be returned.
    If False, then these "bad lines" will dropped from the DataFrame that is
    returned.
warn_bad_lines : bool, default True
    If error_bad_lines is False, and warn_bad_lines is True, a warning for each
    "bad line" will be output.
delim_whitespace : bool, default False
    Specifies whether or not whitespace (e.g. ``' '`` or ``'	'``) will be
    used as the sep. Equivalent to setting ``sep='\s+'``. If this option
    is set to True, nothing should be passed in for the ``delimiter``
    parameter.
low_memory : bool, default True
    Internally process the file in chunks, resulting in lower memory use
    while parsing, but possibly mixed type inference.  To ensure no mixed
    types either set False, or specify the type with the `dtype` parameter.
    Note that the entire file is read into a single DataFrame regardless,
    use the `chunksize` or `iterator` parameter to return the data in chunks.
    (Only valid with C parser).
memory_map : bool, default False
    If a filepath is provided for `filepath_or_buffer`, map the file object
    directly onto memory and access the data directly from there. Using this
    option can improve performance because there is no longer any I/O overhead.
float_precision : str, optional
    Specifies which converter the C engine should use for floating-point
    values. The options are `None` for the ordinary converter,
    `high` for the high-precision converter, and `round_trip` for the
    round-trip converter.

Returns
-------
DataFrame or TextParser
    A comma-separated values (csv) file is returned as two-dimensional
    data structure with labeled axes.

See Also
--------
to_csv : Write DataFrame to a comma-separated values (csv) file.
read_csv : Read a comma-separated values (csv) file into DataFrame.
read_fwf : Read a table of fixed-width formatted lines into DataFrame.

Examples
--------
>>> pd.read_table('data.csv')  # doctest: +SKIP
'''
    pass
@overload
def read_table(filepath: Union[str, Path], sep: str = ..., delimiter: Optional[str] = ..., header: Union[int, List[int], Literal['infer']] = ..., names: Optional[Sequence[str]] = ..., index_col: Optional[Union[int, str, Sequence, Literal[False]]] = ..., usecols: Optional[Union[int, str, Sequence]] = ..., squeeze: bool = ..., prefix: Optional[str] = ..., mangle_dupe_cols: bool = ..., dtype: Optional[Union[str, Dict[str, Any]]] = ..., engine: Optional[Literal['c', 'python']] = ..., converters: Optional[Dict[Union[int, str], Callable]] = ..., true_values: Optional[List[_Scalar]] = ..., false_values: Optional[List[_Scalar]] = ..., skipinitialspace: bool = ..., skiprows: Optional[Union[Sequence, int, Callable]] = ..., skipfooter: int = ..., nrows: Optional[int] = ..., na_values: Optional[Any] = ..., keep_default_na: bool = ..., na_filter: bool = ..., verbose: bool = ..., skip_blank_lines: bool = ..., parse_dates: bool = ..., infer_datetime_format: bool = ..., keep_date_col: bool = ..., date_parser: Optional[Callable] = ..., dayfirst: bool = ..., cache_dates: bool = ..., iterator: bool = ..., chunksize: Optional[int] = ..., compression: Optional[Literal['infer', 'gzip', 'bz2', 'zip', 'xz']] = ..., thousands: Optional[str] = ..., decimal: Optional[str] = ..., lineterminator: Optional[str] = ..., quotechar: str = ..., quoting: int = ..., doublequote: bool = ..., escapechar: Optional[str] = ..., comment: Optional[str] = ..., encoding: Optional[str] = ..., dialect: Optional[str] = ..., error_bad_lines: bool = ..., warn_bad_lines: bool = ..., delim_whitespace: bool = ..., low_memory: bool = ..., memory_map: bool = ..., float_precision: Optional[str] = ...) -> DataFrame: ...

# General Functions. Many of these still need argument types added; for now I used Any.

def bdate_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: str = ..., tz: Any = ..., normalize: bool = ..., name: Any = ..., weekmask: Any = ..., holidays: Any = ..., closed: Any = ..., ) -> DatetimeIndex: ...
def concat(dataframes: List[DataFrame], axis: _AxisType = ..., join: str = ..., ignore_index: bool = ..., keys: Optional[Sequence] = ..., levels: Optional[List[Union[int, str]]] = ..., names: Optional[List[str]] = ..., verify_integrity: bool = ..., sort: bool = ..., copy: bool = ...) -> DataFrame: ...
def crosstab(index: Any, columns: Any, values: Any = ..., rownames: Any = ..., colnames: Any = ..., aggfunc: Any = ..., margins: bool = ..., margins_name: str = ..., dropna: bool = ..., normalize: bool = ...) -> DataFrame: ...
def cut(x: _np.ndarray, bins: int, right: bool = ..., labels: Any = ..., retbins: bool = ..., precision: int = ..., include_lowest: bool = ..., duplicates: str = ...) -> Tuple[List, Any]: ...
def date_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: Any = ..., tz: Any = ..., normalize: bool = ..., name: Any = ..., closed: Any = ..., **kwargs) -> DatetimeIndex: ...
@overload
def describe_option(pat: str, _print_desc: Literal[True]) -> None: ...
@overload
def describe_option(pat: str, _print_desc: Literal[False] = ...) -> None: ...
def eval(expr: Any, parser: str = ..., engine: Optional[str] = ..., truediv: Any = ..., local_dict: Any = ..., global_dict: Any = ..., resolvers: Any = ..., level: int = ..., target: Any = ..., inplace: bool = ...) -> Any: ...
def factorize(values: Any, sort: bool = ..., na_sentinel: int = ..., size_hint: Union[int, None] = None) -> Tuple[_np.ndarray, Union[_np.ndarray, Index]]:
    '''Encode the object as an enumerated type or categorical variable.

This method is useful for obtaining a numeric representation of an
array when all that matters is identifying distinct values. `factorize`
is available as both a top-level function :func:`pandas.factorize`,
and as a method :meth:`Series.factorize` and :meth:`Index.factorize`.

Parameters
----------
values : sequence
    A 1-D sequence. Sequences that aren't pandas objects are
    coerced to ndarrays before factorization.
sort : bool, default False
    Sort `uniques` and shuffle `codes` to maintain the
    relationship.

na_sentinel : int, default -1
    Value to mark "not found".
size_hint : int, optional
    Hint to the hashtable sizer.

Returns
-------
codes : ndarray
    An integer ndarray that's an indexer into `uniques`.
    ``uniques.take(codes)`` will have the same values as `values`.
uniques : ndarray, Index, or Categorical
    The unique valid values. When `values` is Categorical, `uniques`
    is a Categorical. When `values` is some other pandas object, an
    `Index` is returned. Otherwise, a 1-D ndarray is returned.

    .. note ::

       Even if there's a missing value in `values`, `uniques` will
       *not* contain an entry for it.

See Also
--------
cut : Discretize continuous-valued array.
unique : Find the unique value in an array.

Examples
--------
These examples all show factorize as a top-level method like
``pd.factorize(values)``. The results are identical for methods like
:meth:`Series.factorize`.

>>> codes, uniques = pd.factorize(['b', 'b', 'a', 'c', 'b'])
>>> codes
array([0, 0, 1, 2, 0])
>>> uniques
array(['b', 'a', 'c'], dtype=object)

With ``sort=True``, the `uniques` will be sorted, and `codes` will be
shuffled so that the relationship is the maintained.

>>> codes, uniques = pd.factorize(['b', 'b', 'a', 'c', 'b'], sort=True)
>>> codes
array([1, 1, 0, 2, 1])
>>> uniques
array(['a', 'b', 'c'], dtype=object)

Missing values are indicated in `codes` with `na_sentinel`
(``-1`` by default). Note that missing values are never
included in `uniques`.

>>> codes, uniques = pd.factorize(['b', None, 'a', 'c', 'b'])
>>> codes
array([ 0, -1,  1,  2,  0])
>>> uniques
array(['b', 'a', 'c'], dtype=object)

Thus far, we've only factorized lists (which are internally coerced to
NumPy arrays). When factorizing pandas objects, the type of `uniques`
will differ. For Categoricals, a `Categorical` is returned.

>>> cat = pd.Categorical(['a', 'a', 'c'], categories=['a', 'b', 'c'])
>>> codes, uniques = pd.factorize(cat)
>>> codes
array([0, 0, 1])
>>> uniques
[a, c]
Categories (3, object): [a, b, c]

Notice that ``'b'`` is in ``uniques.categories``, despite not being
present in ``cat.values``.

For all other pandas objects, an Index of the appropriate type is
returned.

>>> cat = pd.Series(['a', 'a', 'c'])
>>> codes, uniques = pd.factorize(cat)
>>> codes
array([0, 0, 1])
>>> uniques
Index(['a', 'c'], dtype='object')
'''
    pass
def get_dummies(data: Any, prefix: Any = ..., prefix_sep: str = ..., dummy_na: bool = ..., columns: Any = ..., sparse: bool = ..., drop_first: bool = ..., dtype: Any = ...) -> DataFrame: ...
def get_option(pat: str) -> Any: ...
def infer_freq(index: Any, warn: bool = ...) -> Union[str, None]: ...
def interval_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: Any = ..., name: Any = ..., closed: str = ...) -> None: ...
def isna(df: Union[DataFrame, Series[_DType]]) -> _np.ndarray: ...
def isnull(df: Union[DataFrame, Series[_DType]]) -> _np.ndarray:
    '''
    Detect missing values for an array-like object.

    This function takes a scalar or array-like object and indicates
    whether values are missing (``NaN`` in numeric arrays, ``None`` or ``NaN``
    in object arrays, ``NaT`` in datetimelike).

    Parameters
    ----------
    obj : scalar or array-like
        Object to check for null or missing values.

    Returns
    -------
    bool or array-like of bool
        For scalar input, returns a scalar boolean.
        For array input, returns an array of boolean indicating whether each
        corresponding element is missing.

    See Also
    --------
    notna : Boolean inverse of pandas.isna.
    Series.isna : Detect missing values in a Series.
    DataFrame.isna : Detect missing values in a DataFrame.
    Index.isna : Detect missing values in an Index.

    Examples
    --------
    Scalar arguments (including strings) result in a scalar boolean.

    >>> pd.isna('dog')
    False

    >>> pd.isna(pd.NA)
    True

    >>> pd.isna(np.nan)
    True

    ndarrays result in an ndarray of booleans.

    >>> array = np.array([[1, np.nan, 3], [4, 5, np.nan]])
    >>> array
    array([[ 1., nan,  3.],
           [ 4.,  5., nan]])
    >>> pd.isna(array)
    array([[False,  True, False],
           [False, False,  True]])

    For indexes, an ndarray of booleans is returned.

    >>> index = pd.DatetimeIndex(["2017-07-05", "2017-07-06", None,
    ...                           "2017-07-08"])
    >>> index
    DatetimeIndex(['2017-07-05', '2017-07-06', 'NaT', '2017-07-08'],
                  dtype='datetime64[ns]', freq=None)
    >>> pd.isna(index)
    array([False, False,  True, False])

    For Series and DataFrame, the same type is returned, containing booleans.

    >>> df = pd.DataFrame([['ant', 'bee', 'cat'], ['dog', None, 'fly']])
    >>> df
         0     1    2
    0  ant   bee  cat
    1  dog  None  fly
    >>> pd.isna(df)
           0      1      2
    0  False  False  False
    1  False   True  False

    >>> pd.isna(df[1])
    0    False
    1     True
    Name: 1, dtype: bool
'''
    pass
def melt(frame: DataFrame, id_vars: Union[Tuple, List, _np.ndarray] = ..., value_vars: Any = ..., var_name: Optional[str] = ..., value_name: str = ..., col_level: Optional[Union[int, str]] = ...) -> DataFrame:
    '''Unpivot a DataFrame from wide to long format, optionally leaving identifiers set.

This function is useful to massage a DataFrame into a format where one
or more columns are identifier variables (`id_vars`), while all other
columns, considered measured variables (`value_vars`), are "unpivoted" to
the row axis, leaving just two non-identifier columns, 'variable' and
'value'.

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
DataFrame.melt
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

>>> pd.melt(df, id_vars=['A'], value_vars=['B'])
   A variable  value
0  a        B      1
1  b        B      3
2  c        B      5

>>> pd.melt(df, id_vars=['A'], value_vars=['B', 'C'])
   A variable  value
0  a        B      1
1  b        B      3
2  c        B      5
3  a        C      2
4  b        C      4
5  c        C      6

The names of 'variable' and 'value' columns can be customized:

>>> pd.melt(df, id_vars=['A'], value_vars=['B'],
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

>>> pd.melt(df, col_level=0, id_vars=['A'], value_vars=['B'])
   A variable  value
0  a        B      1
1  b        B      3
2  c        B      5

>>> pd.melt(df, id_vars=[('A', 'D')], value_vars=[('B', 'E')])
  (A, D) variable_0 variable_1  value
0      a          B          E      1
1      b          B          E      3
2      c          B          E      5
'''
    pass
@overload
def merge(left: DataFrame, right: DataFrame, on: str = ..., how: str = ...) -> DataFrame:
    '''Merge DataFrame or named Series objects with a database-style join.

The join is done on columns or indexes. If joining columns on
columns, the DataFrame indexes *will be ignored*. Otherwise if joining indexes
on indexes or indexes on a column or columns, the index will be passed on.

Parameters
----------
left : DataFrame
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
def merge(left: DataFrame, right: DataFrame, left_on: str, right_on: str, how: str = ...) -> DataFrame: ...
@overload
def merge(left: DataFrame, right: DataFrame, left_on: List[str], right_on: List[str], how: str = ...) -> DataFrame: ...
@overload
def merge(left: DataFrame, right: DataFrame, left_index: bool, right_index: bool, how: str = ...) -> DataFrame: ...
def merge_asof(left: Any, right: Any, on: Any = ..., left_on: Any = ..., right_on: Any = ..., left_index: bool = ..., right_index: bool = ..., by: Any = ..., left_by: Any = ..., right_by: Any = ..., suffixes: Any = ..., tolerance: Any = ..., allow_exact_matches: bool = ..., direction: str = ...) -> DataFrame: ...
def merge_ordered(left: Any, right: Any, on: Any = ..., left_on: Any = ..., right_on: Any = ..., left_by: Any = ..., right_by: Any = ..., fill_method: Any = ..., suffixes=('_x', '_y'), how: str = 'outer') -> DataFrame: ...
def notnull(df: Union[DataFrame, Series[_DType]]) -> _np.ndarray:
    '''Detect non-missing values for an array-like object.

    This function takes a scalar or array-like object and indicates
    whether values are valid (not missing, which is ``NaN`` in numeric
    arrays, ``None`` or ``NaN`` in object arrays, ``NaT`` in datetimelike).

    Parameters
    ----------
    obj : array-like or object value
        Object to check for *not* null or *non*-missing values.

    Returns
    -------
    bool or array-like of bool
        For scalar input, returns a scalar boolean.
        For array input, returns an array of boolean indicating whether each
        corresponding element is valid.

    See Also
    --------
    isna : Boolean inverse of pandas.notna.
    Series.notna : Detect valid values in a Series.
    DataFrame.notna : Detect valid values in a DataFrame.
    Index.notna : Detect valid values in an Index.

    Examples
    --------
    Scalar arguments (including strings) result in a scalar boolean.

    >>> pd.notna('dog')
    True

    >>> pd.notna(pd.NA)
    False

    >>> pd.notna(np.nan)
    False

    ndarrays result in an ndarray of booleans.

    >>> array = np.array([[1, np.nan, 3], [4, 5, np.nan]])
    >>> array
    array([[ 1., nan,  3.],
           [ 4.,  5., nan]])
    >>> pd.notna(array)
    array([[ True, False,  True],
           [ True,  True, False]])

    For indexes, an ndarray of booleans is returned.

    >>> index = pd.DatetimeIndex(["2017-07-05", "2017-07-06", None,
    ...                          "2017-07-08"])
    >>> index
    DatetimeIndex(['2017-07-05', '2017-07-06', 'NaT', '2017-07-08'],
                  dtype='datetime64[ns]', freq=None)
    >>> pd.notna(index)
    array([ True,  True, False,  True])

    For Series and DataFrame, the same type is returned, containing booleans.

    >>> df = pd.DataFrame([['ant', 'bee', 'cat'], ['dog', None, 'fly']])
    >>> df
         0     1    2
    0  ant   bee  cat
    1  dog  None  fly
    >>> pd.notna(df)
          0      1     2
    0  True   True  True
    1  True  False  True

    >>> pd.notna(df[1])
    0     True
    1    False
    Name: 1, dtype: bool
'''
    pass
def option_context(*args) -> Any: ... 
def period_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: Any = ..., name: Any = ...) -> PeriodIndex: ...
def pivot(data: DataFrame, index: Optional[str] = ..., columns: Optional[str] = ..., values: Optional[Union[str, List[str]]] = ...) -> DataFrame:
    '''Return reshaped DataFrame organized by given index / column values.

Reshape data (produce a "pivot" table) based on column values. Uses
unique values from specified `index` / `columns` to form axes of the
resulting DataFrame. This function does not support data
aggregation, multiple values will result in a MultiIndex in the
columns. See the :ref:`User Guide <reshaping>` for more on reshaping.

Parameters
----------
data : DataFrame
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
def pivot_table(data: Any, values: Any = ..., index: Any = ..., columns: Any = ..., aggfunc: str = ..., fill_value: Any = ..., margins: bool = ..., dropna: bool = ..., margins_name: str = ..., observed: bool = ...) -> DataFrame: ...
def qcut(x: Any, q: Any, labels: Any = ..., retbins: bool = ..., precision: int = ..., duplicates: str = ...) -> Tuple[Any, Any]: ...
def reset_option(pat: str) -> None: ...
def set_option(pat: str, value: Any) -> None: ...
def timedelta_range(start: Any = ..., end: Any = ..., periods: Any = ..., freq: Any = ..., name: Any = ..., closed: Any = ...) -> TimedeltaIndex: ...
def to_datetime(arg: Any, errors: str = ..., dayfirst: bool = ..., yearfirst: bool = ..., utc: Any = ..., format: Any = ..., exact: bool = ..., unit: Any = ..., infer_datetime_format: bool = ..., origin: str = ..., cache: bool = ...) -> None: ...
def to_numeric(arg: Any, errors: str = ..., downcast: Any = ...) -> Any: ...
def to_timedelta(arg: Any, unit: str = ..., errors: str = ...) -> Any: ...
def unique(values: Series[_DType]) -> _np.ndarray: ...
def wide_to_long(df: DataFrame, stubnames: Any, i: Any, j: Any, sep: str = ..., suffix: str = ...) -> DataFrame: ...

from . import errors
from . import plotting
from .api import types

