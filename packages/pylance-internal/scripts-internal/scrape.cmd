set PYTHON_FOLDER=C:\Python38
set SITE_PACKAGES=%PYTHON_FOLDER%\Lib\site-packages
set SCRAPE=%PYTHON_FOLDER%\python -W ignore -B -E scrape_module.py

rem numpy
md numpy
md numpy\core
%SCRAPE% numpy.core._multiarray_umath > numpy\core\_multiarray_umath.pyi
md numpy\random
%SCRAPE% numpy.random.mtrand > numpy\random\mtrand.pyi

rem lxml
md lxml
%SCRAPE% lxml.etree > lxml\etree.pyi
%SCRAPE% lxml.objectify > lxml\objectify.pyi

rem cv2
md cv2
%SCRAPE% cv2.cv2 %SITE_PACKAGES% > cv2\cv2.pyi
