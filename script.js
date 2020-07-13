
ymaps.ready(function() {
    init(jQuery);
});
function init($) {
    // Без создания карты не будет работать поиск по координатам
    var map = new ymaps.Map('map', {
            center: [30.264981955459618, 59.9567962610097],
            zoom: 9,
            controls: []
        }),
        suggestView = new ymaps.SuggestView('suggest'),
        deliveryPoint, deliveryZones;

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

    function onZonesLoad(json) {
        setZones(json)
        $('#button').bind('click', function (e) {
            geocode();
        });
        $('#suggest').bind('keydown', function(e) {
            if (e.key == 'Enter') $('#button').trigger('click');
        });
    }

    function geocode() {
        var request = $('#suggest').val();
        if (!request) {
            $('#notice').text('Вы ввели пустой запрос');
            return;
        }
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
                $('#notice').text(error);
            } else {
                highlightResult(obj);
            }
        }, function (e) {
            console.log(e)
        })
    }

    function highlightResult(obj) {
        // Удаляем сообщение об ошибке
        $('#notice').text('');
        $('.cloned-about').each(function() {
            $(this).remove();
        })
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
            $('.modal-delivery__header').text('Ближайшие к вам рестораны:');
            if (description.multiple) {
                description.address = description.address.split(', ');
                description.website = description.website.split(', ');
                $('#about-restaurant-1 .name').text(description.name);
                $('#about-restaurant-1 .address').html('<b>Адрес ресторана:</b> ' + description.address[0]);
                $('#about-restaurant-1 .website').text('Перейти в меню');
                $('#about-restaurant-1 .website').attr('href', description.website[0]);
                if (description.zone == 1) {
                    $('#about-restaurant-1 .price').html('<b>Стоимость доставки:</b> Доставка от 1200 рублей бесплатная (минимальный заказ).');
                    $('#about-restaurant-1 .zone').text('Зона - 1')
                } else {
                    $('#about-restaurant-1 .price').html('<b>Стоимость доставки:</b> Доставка от 1800 рублей бесплатная. При сумме заказа менее 1800 рублей, стоимость доставки 200 рублей.');
                    $('#about-restaurant-1 .zone').text('Зона - 2')
                }
                for (let i = 1; i < description.address.length; i++) {
                    var clonedEl = $('#about-restaurant-1').clone(true);
                    clonedEl.addClass('cloned-about about-' + (i + 1));
                    clonedEl.attr('id', '');
                    $('.about-restaurants').append(clonedEl)
                    $('#about-restaurant-1 .website').text('Перейти в меню');
                    $('.about-' + (i + 1) + ' .website').attr('href', description.website[i]);
                    $('.about-' + (i + 1) + ' .address').html('<b>Адрес ресторана:</b> ' + description.address[i]);
                }
            } else {
                $('#about-restaurant-1 .name').text(description.name);
                $('#about-restaurant-1 .address').html('<b>Адрес ресторана:</b> ' + description.address);
                $('#about-restaurant-1 .website').text('Перейти в меню');
                $('#about-restaurant-1 .website').attr('href', description.website);
                if (description.zone == 1) {
                    $('#about-restaurant-1 .price').html('<b>Стоимость доставки:</b> Доставка от 1200 рублей бесплатная (минимальный заказ).');
                    $('#about-restaurant-1 .zone').text('Зона - 1')
                } else {
                    $('#about-restaurant-1 .price').html('<b>Стоимость доставки:</b> Доставка от 1800 рублей бесплатная. При сумме заказа менее 1800 рублей, стоимость доставки 200 рублей.');
                    $('#about-restaurant-1 .zone').text('Зона - 2')
                }
            }
        } else {
            $('#about-restaurant-1 .name').text('');
            $('#about-restaurant-1 .price').text('');
            $('#about-restaurant-1 .zone').text('');
            $('.about-restaurants').addClass('cannot-be-delivered')
            $('.modal-delivery__header').html('ВЫ НАХОДИТЕСЬ СЛИШКОМ ДАЛЕКО &#9785;')
            $('#about-restaurant-1 .address').text(
                'Данный адрес находится вне зоны нашего обслуживания. ' + 
                'Вернитесь на стартовую страницу и выберете другую ' +
                'ресторанную концепцию или закажите спец. доставку по ' +
                'телефону:'
            );
            $('#about-restaurant-1 .website').attr('href', 'tel:+78126111110');
            $('#about-restaurant-1 .website').text('+7 (812) 611-11-10');
        }
        $('#about-modal').modal('show');
    }

    $.ajax({
        url: 'brasserie-kriek.geojson',
        dataType: 'json',
        success: onZonesLoad
    });

    $('.concept-type').on('change', function() {
        map.geoObjects.removeAll();
        $.ajax({
            url: $('.concept-type:checked').val() + '.geojson',
            dataType: 'json',
            success: setZones
        });

        if ($('#suggest').val()) {
            geocode();
        }
    })
}