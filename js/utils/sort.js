

function sortData(data, obj) {
    var column = obj.column || {},
        key = obj.key,
        dir = obj.dir;
    if (column.sortMutlItem) {
        _.map(data, function(d) {
            d.sortMutlItem1 = column.sortParse ? column.sortParse(d[key], d) : d[key];
            var mutlItem2 = self.options.indexColumns[column.sortMutlItem];
            d.sortMutlItem2 = (mutlItem2 && mutlItem2.sortParse) ? mutlItem2.sortParse(d[column.sortMutlItem], d) : d[column.sortMutlItem];

            return d;
        });
        data = _.sortBy(data, ['sortMutlItem1', 'sortMutlItem2']);
    } else {
        data = _.sortBy(data, function(d) {
            if (column.sortParse) {
                return column.sortParse(d[key], d);
            }
            return d[key] || '';
        });
    }
    if (dir == 'DESC') {
        data = data.reverse();
    }
    _.map(data, function(d) {
        if (d.children && d.children.length) {
            d.children = sortData(d.children, obj);
        }
        return d;
    });
    return data;
}

export default sortData;