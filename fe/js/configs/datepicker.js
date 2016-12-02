

import $ from 'jquery';
import 'jquery-ui/ui/i18n/datepicker-zh-CN';
import 'jquery-ui/themes/base/core.css';
import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/datepicker.css';

$.datepicker.setDefaults({
    changeMonth: true,
    changeYear: true,
    dateFormat: 'yy-mm-dd',
    showOn: "both",
    buttonImage: `${_config.base}/static/img/calendar.png`,
    buttonImageOnly: true
});

$.datepicker.setDefaults($.datepicker.regional['zh-CN']);
