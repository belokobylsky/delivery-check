ymaps.ready(function() {
    init(jQuery);
});

/* 
var file = document.createElement("link");
file.setAttribute("rel", "stylesheet");
file.setAttribute("type", "text/css");
file.setAttribute("href", '/delivery_zones/style.min.css');
document.head.appendChild(file);
*/

function init($) {
    // Без создания карты не будет работать поиск по координатам
    var map = new ymaps.Map('map', {
            center: [30.264981955459618, 59.9567962610097],
            zoom: 9,
            controls: []
        }),
        suggestView = new ymaps.SuggestView('search-address-inp'),
        deliveryPoint, deliveryZones;

    $('#search-address-submit').bind('click', function (e) {
        if (!$('#search-address-inp').val()) {
            $('#search-address-notice').text('Вы ввели пустой запрос');
            return;
        }
        map.geoObjects.removeAll();
        if (!$('.concept-type:checked').val()) {
            data.cannotBeDelivered();
            return;
        }
        $.ajax({
            url: /* '/delivery_zones/' + */ $('.concept-type:checked').val() + '.geojson',
            dataType: 'json',
            success: setZones
        });
        geocode();
    });
    $('#search-address-inp').bind('keydown', function(e) {
        if (e.key == 'Enter') $('#search-address-submit').trigger('click');
    });
    $('#search-address-reset').bind('click', function() {
        $('#search-address-inp').val('');
        $('#search-address-notice').text('');
    });
    
    $('.concept-type').on('change', function() {
        map.geoObjects.removeAll();
        var value = $('.concept-type:checked').val();
        $.ajax({
            url: /* '/delivery_zones/' + */ $('.concept-type:checked').val() + '.geojson',
            dataType: 'json',
            success: setZones
        });
        $('.concept-row').each(function() {
            if(!$(this).is('#section-' + value)) {
                $(this).addClass('d-none');
            } else {
                $(this).removeClass('d-none');
            }
        })
        if ($('#search-address-inp').val()) {
            geocode();
        }
    });


    function setZones(json) {
        deliveryPoint = new ymaps.GeoObject({
            geometry: {type: 'Point'},
            properties: {iconCaption: 'Адрес'}
        }, {
            preset: 'islands#blackDotIconWithCaption',
            iconCaptionMaxWidth: '215'
        });
        map.geoObjects.add(deliveryPoint);
        deliveryZones = ymaps.geoQuery(json).addToMap(map);
    }


    function geocode() {
        var request = $('#search-address-inp').val();
        
        // Геокодируем введённые данные.
        ymaps.geocode(request).then(function (res) {
            var obj = res.geoObjects.get(0),
                error;
    
            if (obj) {
                switch (obj.properties.get('metaDataProperty.GeocoderMetaData.precision')) {
                    case 'exact':
                        break;
                    case 'number':
                    case 'near':
                    case 'range':
                        error = 'Уточните номер дома';
                        break;
                    case 'street':
                        error = 'Уточните номер дома';
                        break;
                    case 'other':
                    default:
                        error = 'Уточните адрес';
                }
            } else {
                error = 'Адрес не найден';
            }
            if (error) {    
                $('#search-address-notice').text(error);
            } else {
                try {
                    var desc = highlightResult(obj);
                    data.set(desc);
                } catch(err) {
                    console.error(err);
                    data.cannotBeDelivered();
                }
            }
        }, function (e) {
            console.error(e)
        })
    }
    
    function highlightResult(obj) {
        $('#search-address-notice').text('');
        $('.cloned-about').each(function() {
            $(this).remove();
        });
        var coords = obj.geometry.getCoordinates();
        var polygon = deliveryZones.searchContaining(coords).get(1) || deliveryZones.searchContaining(coords).get(0);
        deliveryPoint.geometry.setCoordinates(coords);
        if (polygon) {
            var description = {
                array: polygon.properties.get('description').split('; ')
            };
            description.array.forEach(function(item) {
                var itemArr = item.split('=');
                description[itemArr[0]] = itemArr[1];
            });
            $('.about-restaurants').removeClass('cannot-be-delivered')
            $('.modal-delivery__header span').text('Ближайшие к вам рестораны:');
            return description;
        } else {
            throw new Error('Cannot be delivered');
        }
    }
    
    var data = {
        // Метод ниже устанавливает данные в модальное окно
        set: function(description) {
            $('#about-restaurant-1 .about-restaurant__name').text(description.name);
            $('#about-restaurant-1 .about-restaurant__website').text('Перейти в меню');
            if (description.zone == 1) {
                $('#about-restaurant-1 .about-restaurant__price').html('<b>Стоимость доставки: Зона - 1</b> Доставка от 1200 рублей бесплатная (минимальный заказ).');
            } else {
                $('#about-restaurant-1 .about-restaurant__price').html('<b>Стоимость доставки: Зона - 2</b> Доставка от 1800 рублей бесплатная. При сумме заказа менее 1800 рублей, стоимость доставки 200 рублей.');
            }
            if (description.multiple) {
                description.address = description.address.split(', ');
                description.website = description.website.split(', ');
                $('#about-restaurant-1 .about-restaurant__address').html('<b>Адрес ресторана:</b> ' + description.address[0]);
                $('#about-restaurant-1 .about-restaurant__website').attr('href', description.website[0]);
                
                for (var i = 1; i < description.address.length; i++) {
                    var clonedEl = $('#about-restaurant-1').clone(true);
                    clonedEl.addClass('cloned-about about-' + (i + 1));
                    clonedEl.attr('id', '');
                    $('.about-restaurants').append(clonedEl)
                    $('.about-' + (i + 1) + ' .about-restaurant__website').attr('href', description.website[i]);
                    $('.about-' + (i + 1) + ' .about-restaurant__address').html('<b>Адрес ресторана:</b> ' + description.address[i]);
                }
            } else {
                $('#about-restaurant-1 .about-restaurant__address').html('<b>Адрес ресторана:</b> ' + description.address);
                $('#about-restaurant-1 .about-restaurant__website').attr('href', description.website);
            }
            $('#about-modal').modal('show');
        },
        
        async cannotBeDelivered() {
            console.log('true :>> ', true);
            var descsArr = [];
            for await (let desc of this._getDefault()) {
                console.log('desc :>> ', desc);
                try {
                    descsArr.push(desc);
                } catch(err) {
                    console.error(err);
                }
            }
            var descsFiltered = descsArr.filter(item => item);
            console.log('descsArr :>> ', descsArr);
            console.log('descsFiltered :>> ', descsFiltered);
            if (!descsFiltered.length) {
                this._throwError();
            } else {
                if ($('.concept-type').is(':checked')) {
                    console.log('true :>> ', true);
                    $(
                        '<p class="cloned-about">' +
                        'Данный адрес вне зоны обслуживания выбранной концепции. ' +
                        'Однако он попал в зоны доставки следующих ресторанов:' +
                        '</p>'
                    ).prependTo('.about-restaurants');
                }
                this._setArray(descsFiltered);
            }
        },

        async *_getDefault() {
            for (let i = 0; i < $('.concept-type').length; i++) {
                var current = $('.concept-type')[i];
                if (current.checked) continue;
                var result;
                await new Promise(function(resolve, reject) {
                    $.ajax({
                        url: /* '/delivery_zones/' + */ current.value + '.geojson',
                        dataType: 'json',
                        success: function(json) {
                            setZones(json);
                            var request = $('#search-address-inp').val();
                            ymaps.geocode(request).then(function (res) {
                                try {
                                    result = highlightResult(res.geoObjects.get(0));
                                    console.log('result :>> ', result);
                                } catch(err) {
                                    result = undefined;
                                }
                                resolve();
                            }, function (e) {
                                console.error(e)
                            });
                        }
                    }); 
                }).catch(err => console.error(err));
                yield result || '';
            }
        },

        _throwError: function() {
            $('#about-restaurant-1 .about-restaurant__name').text('');
            $('#about-restaurant-1 .about-restaurant__price').text('');
            $('.about-restaurants').addClass('cannot-be-delivered')
            $('.modal-delivery__header span').html('ВЫ НАХОДИТЕСЬ СЛИШКОМ ДАЛЕКО &#9785;')
            $('#about-restaurant-1 .about-restaurant__address').text(
                'Данный адрес находится вне зоны нашего обслуживания. ' + 
                'Вернитесь на стартовую страницу и выберете другую ' +
                'ресторанную концепцию или закажите спец. доставку по ' +
                'телефону:'
            );
            $('#about-restaurant-1 .about-restaurant__website').attr('href', 'tel:+78126111110');
            $('#about-restaurant-1 .about-restaurant__website').text('+7 (812) 611-11-10');
            $('#about-modal').modal('show');
        },

        _setArray(descs) {
            $('#about-restaurant-1 .about-restaurant__website').text('Перейти в меню');

            $('#about-restaurant-1 .about-restaurant__name').text(descs[0].name);
            if (descs[0].multiple) {
                var firstAddr = descs[0].address.split(', ')[0],
                    firstWeb = descs[0].website.split(', ')[0];
            } else {
                var firstAddr = descs[0].address,
                    firstWeb = descs[0].website;
            }
            $('#about-restaurant-1 .about-restaurant__address').html('<b>Адрес ресторана:</b> ' + firstAddr);
            $('#about-restaurant-1 .about-restaurant__website').attr('href', firstWeb);
            if (descs[0].zone == 1) {
                $('#about-restaurant-1 .about-restaurant__price').html('<b>Стоимость доставки: Зона - 1</b> Доставка от 1200 рублей бесплатная (минимальный заказ).');
            } else {
                $('#about-restaurant-1 .about-restaurant__price').html('<b>Стоимость доставки: Зона - 2</b> Доставка от 1800 рублей бесплатная. При сумме заказа менее 1800 рублей, стоимость доставки 200 рублей.');
            }
            
            for (var i = 1; i < descs.length; i++) {
                var clonedEl = $('#about-restaurant-1').clone(true);
                clonedEl.addClass('cloned-about about-' + (i + 1));
                clonedEl.attr('id', '');
                $('.about-restaurants').append(clonedEl);
                $('.about-' + (i + 1) + ' .about-restaurant__name').text(descs[i].name);
                if (descs[i].multiple) {
                    var currentAddr = descs[i].address.split(', ')[0],
                        currentWeb = descs[i].website.split(', ')[0];
                } else {
                    var currentAddr = descs[i].address,
                        currentWeb = descs[i].website;
                }
                $('.about-' + (i + 1) + ' .about-restaurant__address').html('<b>Адрес ресторана:</b> ' + currentAddr);
                $('.about-' + (i + 1) + ' .about-restaurant__website').attr('href', currentWeb);

                if (descs[i].zone == 1) {
                    $('#about-restaurant-1 .about-restaurant__price').html('<b>Стоимость доставки: Зона - 1</b> Доставка от 1200 рублей бесплатная (минимальный заказ).');
                } else {
                    $('#about-restaurant-1 .about-restaurant__price').html('<b>Стоимость доставки: Зона - 2</b> Доставка от 1800 рублей бесплатная. При сумме заказа менее 1800 рублей, стоимость доставки 200 рублей.');
                }
            }
            $('#about-modal').modal('show');
        }
    }

}