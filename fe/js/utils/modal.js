
global.jQuery = require('jquery');
require('bootstrap');
define([
    'lodash',
], function(_) {
    'use strict';

    var Modal, defaults;

    defaults = {
        title: '',
        content: ''
    };

    var hasShowing = false;

    Modal = function(options) {
        var wrapper, tpl, _this, content;
        _this = this;

        options = this.options = _.extend({}, defaults, options);
        tpl = '<div class="modal fade"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><a type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span></a><h4 class="modal-title"></h4></div><div class="modal-body"></div><div class="modal-footer"></div></div></div></div>';
        wrapper = $(tpl);
        if (options.bigger) wrapper.addClass('bigger');
        if (options.left) wrapper.addClass('left');
        this.body = wrapper.find('.modal-body');
        this.title = wrapper.find('.modal-title');
        var footer = this.footer = wrapper.find('.modal-footer');

        if (options.content) {
            if (_.isFunction(options.content)) {
                content = options.content();
            } else {
                content = options.content.replace(/\n/g, '<br/>');
            }

            this.body.append(content);
        }

        if (options.title) {
            this.title.html(options.title);
        }
        if (hasShowing) return;
        $('.modal.fade').remove();
        $('.modal-backdrop.fade').remove();
        $(document.body).append(wrapper);
        this.$el = wrapper;
        this.$el.modal(options);
        this.show();

        this.$el.on('hide.bs.modal',function(){
            hasShowing = false;
        });

        hasShowing = true;
        var doc = $(document);
        doc.on("keypress", function(e) {
            e.stopPropagation();
            var positiveBtn = footer.find(".positive");
            if (e.which === 13) {
                if (!options.noFocus && positiveBtn.hasClass("focusOn")) {
                    doc.off("keypress");
                    doc.off("keydown");
                    positiveBtn.trigger('click');
                } else {
                    _this.hide();
                    doc.off("keypress");
                    doc.off("keydown");
                    if (options.no) {
                        options.no();
                    }
                }
            }
        });
    };

    Modal.prototype.show = function() {
        this.$el.modal('show');
    };

    Modal.prototype.hide = function() {
        hasShowing = false;
        if (this.options.confirm) {
            this.options.confirm();
        }
        this.$el.modal('hide');
    };

    Modal.prototype.destroy = function() {
        this.hide();
        this.$el.remove();
    };

    Modal.Confirm = function(options) {
        options = _.defaults(options || {}, {
            backdrop: 'static',
            positive: '确认',
            negtive: '取消',
            bigger: false,
            noFocus: false
        });

        var modal = new Modal(options);
        if (!modal.$el) return;
        modal.footer.append('<button class="btn btn-blue positive">' + options.positive + '</button><button class="btn btn-white negtive">' + options.negtive + '</button>');

        if (!options.noFocus) {
            modal.$el.find(".positive").addClass("focusOn");
        }
        var doc = $(document);
        modal.$el.on('click', '.positive', function(e) {
            e.preventDefault();
            if (options.yes) {
                options.yes();
            }
            modal.hide();
            doc.off("keypress");
            doc.off("keydown");
        }).on('click', '.negtive, .close', function(e) {
            e.preventDefault();
            if (options.no) {
                options.no();
            }
            modal.hide();
            doc.off("keypress");
            doc.off("keydown");
        });
        doc.on("keydown", function(e) {
            if (e.keyCode === 39 || e.keyCode === 37) {
                modal.footer.find("button").toggleClass("focusOn");
            }
        });
        return modal;
    };

    Modal.Alert = function(options) {
        options = _.defaults(options || {}, {
            OK: '确认'
        });
        if (options.content && options.content.length > 150) {
            options.bigger = true;
        }
        var modal = new Modal(options);
        if (!modal.$el) return;
        modal.footer.append('<button class="btn btn-blue confirm focusOn" data-dismiss="modal">' + options.OK + '</button>');

        modal.$el.on('click', '.confirm,.close', function(e) {
            modal.hide();
            e.preventDefault();
        });

        return modal;
    };

    Modal.Prompt = function(options) {
        options = _.defaults(options || {}, {
            OK: '确认',
            placeholder: '',
            defaults: '',
            autoHide: true
        });

        var modal = new Modal(options);

        modal.body.append('<div class="form-group"><input class="text form-control" type="text" placeholder="' + options.placeholder + '" value="' + options.defaults + '"></div>');

        modal.footer.append('<button class="btn btn-blue">' + options.OK + '</button>');

        modal.$el.on('click', '.btn-blue', function(e) {
            if (options.val) {
                options.val(modal.$el.find('.text').val());
            }
            if (options.autoHide) {
                modal.hide();
            }

            e.preventDefault();
        });

        return modal;
    };

    return Modal;
});
