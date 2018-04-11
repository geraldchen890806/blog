

import React, {Component} from 'react';
import 'select2';

export default class Select extends Component {

    componentDidMount() {
        var {width, onChange} = this.props;
        $(this.refs.select).select2({minimumResultsForSearch: Infinity, width: width}).on('select2:select', function(e) {
            onChange(e);
        });
    }

    componentWillReceiveProps(nextProps) {
        $(this.refs.select).val(nextProps.value).trigger('change');
    }


    render() {
        var {value} = this.props;
        return <select ref='select' value={value} onChange={()=>{}}>
            {this.props.children}
        </select>;
    }
}
