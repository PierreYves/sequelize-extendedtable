
let SequelizeExtendedTable = {
    sequelize: null,

    init (sequelize) {
        this.sequelize = sequelize;

        this.sequelize.afterDefine('afterDefine_extendedtable', (model) => {
            model.extended = (options) => {
                let parent = this;

                model.prototype._set = model.prototype.set;
                model.prototype.set = function (key, value, options) {
                    if (typeof key !== 'object' && key !== null) {
                        if (!this._populated) {
                            parent.populateInstance(this, model);
                        }

                        let _oldValue = this.get(key);
                        this._set(key, value, options);

                        if (this._populated) {
                            if (this._extendedAttributes.indexOf(key) !== -1) {
                                this._extendedObject.set(key, value, options);
                            }
                        }

                        if (key === model._extendedOptions.extendedField && _oldValue !== value && this._populated) {
                            parent.clearInstance(this, model);
                            parent.populateInstance(this, model);
                        }
                    }
                    else {
                        this._set(key, value, options);
                    }
                };

                model._extendedOptions = Object.assign({
                    extendedField: 'extended',
                    foreignKey: 'id'
                }, options);

                let defaultScope = Object.assign({ include: [] }, model.options.defaultScope);

                Object.keys(model._extendedOptions.models).forEach((type) => {
                    let _extended_model = null;

                    if (sequelize.Model.isPrototypeOf(model._extendedOptions.models[type])) {
                        _extended_model = model._extendedOptions.models[type];
                    }
                    else {
                        throw new Error('Extended.models must contains only Sequelize Model');
                    }

                    _extended_model.belongsTo(model, {
                        as: 'EXTENDED_' + type,
                        foreignKey: model._extendedOptions.foreignKey,
                    });

                    model.hasOne(_extended_model, {
                        as: 'EXTENDED_' + type,
                        foreignKey: model._extendedOptions.foreignKey,
                    });

                    defaultScope.include.push({
                        model: _extended_model,
                        as: 'EXTENDED_' + type,
                        required: false
                    });
                });

                model.addScope('defaultScope', defaultScope, { override: true });

                model.afterFind('afterFind_extendedtable', (results, options) => {
                    let mergeModels = (result) => {
                        let extended = 'EXTENDED_' + result[model._extendedOptions.extendedField];

                        if (options.raw) {
                            Object.keys(result).forEach((property) => {
                                if (property.substring(0, extended.length) === extended) {
                                    result[property.substring(extended.length + 1)] = result[property];
                                }

                                if (property.substring(0, 'EXTENDED_'.length) === 'EXTENDED_') {
                                    delete result[property];
                                }
                            });
                        }
                        else
                        {
                            if (typeof result[extended] !== 'undefined') {
                                this.populateInstance(result, model);

                                result._extendedObject = result[extended];

                                Object.keys(result[extended].dataValues).forEach((property) => {
                                    result.dataValues[property] = result[extended].getDataValue(property);
                                });
                            }

                            Object.keys(result.dataValues).forEach((property) => {
                                if (property.substring(0, 'EXTENDED_'.length) === 'EXTENDED_') {
                                    delete result[property];
                                    delete result.dataValues[property];
                                }
                            });
                        }

                        return result;
                    };

                    if (Array.isArray(results))
                    {
                        results.forEach((result) => {
                            mergeModels(result);
                        });
                    }
                    else
                    {
                        mergeModels(results);
                    }

                    return results;
                });

                model.options.hooks.extended_afterCreate = (model.options.hooks.afterCreate || []);
                model.afterCreate('afterCreate_extendedtable', (instance, options) => {
                    if (!instance._extendedObject) {
                        return;
                    }

                    instance._extendedObject.set(model._extendedOptions.foreignKey, instance.get(model._extendedOptions.foreignKey));

                    if (model.options.hooks.extended_afterCreate.length > 0) {
                        instance._extendedObject.save()
                            .then(() => {
                                return model.runHooks(model.options.hooks.extended_afterCreate, instance, options);
                            });
                    } else {
                        return instance._extendedObject.save();
                    }
                });
                model.options.hooks.afterCreate = [model.options.hooks.afterCreate.pop()];

                model.beforeUpdate('beforeUpdate_extendedtable', (instance) => {
                    if (!instance._extendedObject) {
                        return;
                    }

                    if (instance._extendedObject.changed()) {
                        return instance._extendedObject.save();
                    }
                });

                model.afterDestroy('afterDestroy_extendedtable', (instance) => {
                    if (!instance._extendedObject) {
                        return;
                    }

                    return instance._extendedObject.destroy();
                });

                model.beforeValidate('beforeValidate_extendedtable', (instance, options) => {
                    if (!instance._extendedObject) {
                        return;
                    }

                    return instance._extendedObject.validate(options);
                });
            };
        });
    },

    populateInstance (instance, model) {
        let _extendedObject = model._extendedOptions.models[ instance.get(model._extendedOptions.extendedField) ];
        if (typeof _extendedObject === 'undefined') {
            return;
        }

        instance._extendedObject = _extendedObject.build();
        instance._extendedAttributes = [];

        instance._extendedObject.attributes.forEach((property) => {
            if (property === model._extendedOptions.foreignKey) {
                return;
            }

            instance._extendedAttributes.push(property);
            instance.attributes.push(property);
            instance.dataValues[property] = instance._extendedObject.getDataValue(property);

            Object.defineProperty(instance, property, {
                configurable: true,
                get: function () { return this.get(property); },
                set: function (value) { this.set(property, value); }
            });
        });

        instance._populated = true;
    },

    clearInstance (instance, model) {
        if (!instance._populated) {
            return;
        }

        instance.attributes.forEach((property, index) => {
            if (!model.attributes[property]) {
                instance.attributes.splice(index, 1);
                delete instance._changed[property];
                delete instance[property];
            }
        });

        delete instance._extendedObject;
        instance._populated = false;
    },
};

module.exports = SequelizeExtendedTable;
