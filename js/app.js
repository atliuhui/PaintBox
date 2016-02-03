/* global Backbone */
/* global _ */
/* global $ */
/* global Handlebars */

var ColorModel = Backbone.Model.extend({
    idAttribute: "id",
    defaults: function(){
        var now = (new Date());
        return {
            title: null,
            colors: [],
            createtime: now.getTime(),
            updatetime: now.getTime()
        };
    },
    newId: function() {
        this.set({id: 'C{seed}'.replace('{seed}', (new Date()).getTime())});
    },
    toJSON: function() {
        var data = _.clone(this.attributes);
        data.colorString = JSON.stringify(data.colors);
        return data;
    },
    sync: Backbone.localforage.sync('Color')
});
var ColorCollection = Backbone.Collection.extend({
    model: ColorModel,
    comparator: 'updatetime',
    sync: Backbone.localforage.sync('ColorCollection')
});

var EditView = Backbone.View.extend({
    template: Handlebars.compile('<form style="margin-bottom: 20px;">' +
    '<div class="form-group">' +
    '        <label for="title">Title</label>' +
    '        <input type="hidden" class="form-control" data-cid="id" value="{{id}}" placeholder="Title">' +
    '        <input type="text" class="form-control" data-cid="title" value="{{title}}" placeholder="Title">' +
    '    </div>' +
    '    <div class="form-group">' +
    '        <label for="color">Color Array</label>' +
    '        <input type="text" class="form-control" data-cid="colorString" value="{{colorString}}" placeholder="Title">' +
    '    </div>' +
    '    <div class="form-group" data-cid="colors">' +
    '    </div>' +
    '</form>'),
    events: {
        'change input[type=text]': 'save'
    },
    initialize: function(options) {
        this._app = options.app;
        
        this.listenTo(this.model, 'change', this.save);
    },
    render: function(model) {
        this.model = model;
        this.setElement(this.template(this.model.toJSON()));
        this.$colors = this.$('[data-cid=colors]');
        
        var color = new ColorView({ colors: this.model.get('colors'), width: this._app.$edit.width() });
        
        this.$colors.html(color.render().el);

        return this;
    },
    save: function() {
        try {
            if(this.$('[data-cid=id]').val()) {
                this.model.set('id', this.$('[data-cid=id]').val());
            }
            this.model.set('title', this.$('[data-cid=title]').val());
            var colors = eval(this.$('[data-cid=colorString]').val());
            if(!$.isArray(colors)) { throw '请输入色值数组'; }
            // this.model.set('colors', JSON.parse(this.$('[data-cid=colorString]').val()));
            this.model.set('colors', colors);
            
            if(this.model.isNew()) {
                this.model.newId();
                this.collection.create(this.model);
            } else {
                this.model.save();
            }
            
            this.$('[data-cid=id]').val(this.model.id);
            
            var color = new ColorView({ colors: this.model.get('colors'), width: this._app.$edit.width() });
            
            this.$colors.html(color.render().el);
        } catch (error) {
            alert(error);
        }
    }
});
var ListView = Backbone.View.extend({
    template: Handlebars.compile('<ul class="list-group">' +
    '    <li class="list-group-item active">Favorites</li>' +
    '</ul>'),
    events: {
    },
    initialize: function(options) {
        this._app = options.app;
        
        this.listenTo(this.collection, 'add', this.addOne);
        this.listenTo(this.collection, 'reset', this.addAll);
    },
    render: function() {
        this.setElement(this.template());
        
        this.collection.fetch();
        
        return this;
    },
    addOne: function(item) {
        var view = new ListItemView({collection: this.collection, model: item, app: this._app});
        this.$el.append(view.render().el);
    },
    addAll: function() {
        this.collection.each(this.addOne, this);
    }
});
var ListItemView = Backbone.View.extend({
    template: Handlebars.compile('<li class="list-group-item" data-id="{{id}}"></li>'),
    events: {
        'click': 'edit'
    },
    initialize: function(options) {
        this._app = options.app;
        
        this.listenTo(this.model, 'change', this.review);
        this.listenTo(this.model, 'destroy', this.destroy);
    },
    render: function() {
        this.setElement(this.template(this.model.toJSON()));

        var color = new ColorView({ colors: this.model.get('colors'), width: this._app.$list.width() - 16 - 16 });
        
        this.$el.html(color.render().el);
        
        return this;
    },
    review: function() {
        $('li[data-id={id}]'.replace('{id}', this.model.id)).replaceWith(this.render().el);
    },
    edit: function() {
        this._app.edit(this.model);
    },
    destroy: function() {
        this.$el.remove();
    }
});
var ColorView = Backbone.View.extend({
    template: Handlebars.compile('<div class="color-set" title="{{title}}"></div>'),
    events: {
    },
    initialize: function(options) {
        this._title = options.title;
        this._colors = options.colors;
        this._width = options.width;
    },
    render: function() {
        this.setElement(this.template());
        
        var count = this._colors.length;
        var width = this._width;
        var itemCollection = _.map(this._colors, function(item, index) {
            var itemWidth = parseInt(width / (count - index));
            var html = '<div class="color-item" style="width:{width}px;background-color:{color};"></div>'
                .replace('{color}', item)
                .replace('{width}', itemWidth);
            width = width - itemWidth;
                
            return html;
        });
        
        this.$el.html(itemCollection.join(''));
        
        return this;
    }
});
var AppView = Backbone.View.extend({
    events: {
        'click #create': 'create',
        'click #delete': 'delete',
        'click #sample': 'sample'
    },
    initialize: function() {
        this.setElement($('body'));
        // this.$create = this.$('#create');
        // this.$delete = this.$('#delete');
        // this.$sample = this.$('#sample');
        this.$edit = this.$('#edit');
        this.$list = this.$('#list');
        
        this._data = {
            colors: new ColorCollection()
        };
        
        this.editView = new EditView({collection: this._data.colors, model: new ColorModel(), app: this});
        this.listView = new ListView({collection: this._data.colors, app: this});
    },
    render: function() {
        // this.$delete.attr('disabled', true);
        this.$list.html(this.listView.render().el);
        this.edit(new ColorModel());
        
        return this;
    },
    create: function() {
        this.edit(new ColorModel());
    },
    edit: function(model) {
        this.$edit.html(this.editView.render(model).el);
    },
    delete: function() {
        this._data.colors.get(this.editView.model.id).destroy();
        this.create();
    },
    sample: function() {
        var item = new ColorModel({
            title: 'bootstrap',
            colors: ['#204d74', '#5cb85c', '#5bc0de', '#f0ad4e', '#d9534f']
        });
        item.newId();
        this._data.colors.create(item);
    }
});
