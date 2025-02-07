(function(){
    var PLUGIN_ID = 'torrserver_auto_switcher';
    var userLang = Lampa.Storage.get('language') === 'ru' ? 'ru' : 'en';

    var i18n = {
        ru: {
            log_links_not_configured: 'Серверные ссылки не настроены. Завершаем работу.',
            log_check_primary: 'Проверяем основной сервер...',
            log_primary_available: 'Основной сервер доступен ✅',
            log_primary_unavailable: 'Основной сервер недоступен ❌. Проверяем запасной...',
            log_switch_secondary: 'Переключаемся на запасной сервер ✅',
            log_both_unavailable: 'Оба сервера недоступны ❌',
            log_plugin_loaded: 'Плагин загружен и начал работу! 🚀',
            log_set: 'Установлено',
            noty_primary: 'Переключаемся на основной сервер ✅',
            noty_primary_available_again: 'Основной сервер снова доступен ✅',
            noty_secondary: 'Переключаемся на запасной сервер ✅',
            noty_secondary_available_again: 'Запасной сервер снова доступен ✅',
            noty_both_unavailable: 'TorrServer недоступен ❌',

            log_player_call_intercepted: 'Перехвачен вызов play. Исходные данные:',
            log_player_intercepted: 'Метод Lampa.Player.play перехвачен.',
            log_player_changedURL: 'Изменённый URL для плеера:',
            log_player_url_changed_error: 'Ошибка при изменении URL:',
        },
        en: {
            log_links_not_configured: 'Server URLs not configured. Exiting.',
            log_check_primary: 'Checking primary server...',
            log_primary_available: 'Primary server available ✅',
            log_primary_unavailable: 'Primary server unavailable ❌. Checking backup...',
            log_switch_secondary: 'Switching to backup server ✅',
            log_both_unavailable: 'Both servers unavailable ❌',
            log_plugin_loaded: 'Plugin loaded and running! 🚀',
            log_set: 'Set',
            noty_primary: 'Switching to primary server ✅',
            noty_primary_available_again: 'The main server is available again ✅',
            noty_secondary: 'Switching to backup server ✅',
            noty_secondary_available_again: 'The backup server is available again ✅',
            noty_both_unavailable: 'TorrServer unavailable ❌',

            log_player_call_intercepted: 'Play call intercepted. Initial data:',
            log_player_intercepted: 'The Lampa.Player.play method is intercepted.',
            log_player_changedURL: 'Changed URL for the player:',
            log_player_url_changed_error: 'Error changing URL:',
        }
    };
    
    var isLastCheckUnavailableAll = false;
    var T = i18n[userLang];

    function log(msg) {
        console.log(`[${PLUGIN_ID}] ${msg}`);
    }

    function getSetting(name) {
        return Lampa.Storage.get(name);
    }

    function setSetting(name, value) {
        Lampa.Storage.set(name, value);
        log(`${T.log_set} ${name} = ${value}`);
    }
    
    async function checkServer(url) {
        var controller = new AbortController();
        var signal = controller.signal;
    
        var checkServerTimeoutId = setTimeout(() => {
            controller.abort();
        }, 5000);
    
        return fetch(url, {
            mode: 'no-cors',
            cache: 'no-store',
            signal: signal
        })
        .then(() => {
            return true;
        })
        .catch(() => {
            return false;
        })
        .finally(() => {
            clearTimeout(checkServerTimeoutId);
        });
    }
    
    async function switchTorrserver() {
        var primaryURL = getSetting('torrserver_url');
        var secondaryURL = getSetting('torrserver_url_two');
        var currentLink = getSetting('torrserver_use_link');
    
        if (!primaryURL || !secondaryURL) {
            log(T.log_links_not_configured);
            return;
        }
    
        log(T.log_check_primary);
    
        try {
            const isPrimaryAlive = await checkServer(primaryURL);
            console.log('First checkserver await');
            if (isPrimaryAlive) {
                if (currentLink !== 'one') {
                    setSetting('torrserver_use_link', 'one');
                    Lampa.Noty.show(T.noty_primary);
                }
                if (isLastCheckUnavailableAll) Lampa.Noty.show(T.noty_primary_available_again);
                log(T.log_primary_available);
                isLastCheckUnavailableAll = false;
                return true;
            }
        } catch (e) {
            log(T.log_primary_unavailable);
        }
    
        try {
            const isSecondaryAlive = await checkServer(secondaryURL);
            if (isSecondaryAlive) {
                if (currentLink !== 'two') {
                    setSetting('torrserver_use_link', 'two');
                    Lampa.Noty.show(T.noty_secondary);
                }
                if (isLastCheckUnavailableAll) Lampa.Noty.show(T.noty_secondary_available_again);
                log(T.log_switch_secondary);
                isLastCheckUnavailableAll = false;
                return true;
            }
        } catch (e) {
            log(T.log_both_unavailable);
        }
    
        if (!isLastCheckUnavailableAll) {
            isLastCheckUnavailableAll = true;
            Lampa.Noty.show(T.noty_both_unavailable);
        }
    
        throw new Error('Servers invalid');
    }
    

    setInterval(switchTorrserver, 60 * 1000);
    switchTorrserver();
    log(T.log_plugin_loaded);

    function interceptPlayerPlay() {
        if (!Lampa || !Lampa.Player || typeof Lampa.Player.play !== 'function'){
            console.error(PLUGIN_ID, 'Is Lampa.Player.play not found!');
            return;
        }
        var originalPlay = Lampa.Player.play;
        Lampa.Player.play = function(data) {
            console.log(PLUGIN_ID, T.log_player_call_intercepted, data);
            if (data && data.url) {
                try {
                    var urlObj = new URL(data.url);
                    
                    var primaryURL = getSetting('torrserver_url');
                    var secondaryURL = getSetting('torrserver_url_two');

                    var primaryHost = primaryURL ? new URL(primaryURL).host : null;
                    var secondaryHost = secondaryURL ? new URL(secondaryURL).host : null;
                    
                    if (
                        (primaryHost && urlObj.host.includes(primaryHost)) ||
                        (secondaryHost && urlObj.host.includes(secondaryHost))
                    ) {
                        var currentLink = getSetting('torrserver_use_link');
                        if (currentLink === 'one' && primaryURL) {
                            var newUrl = new URL(primaryURL);
                            urlObj.host = newUrl.host;
                            urlObj.protocol = newUrl.protocol;
                        } else if (currentLink === 'two' && secondaryURL) {
                            var newUrl = new URL(secondaryURL);
                            urlObj.host = newUrl.host;
                            urlObj.protocol = newUrl.protocol;
                        }
                        data.url = urlObj.toString();
                        console.log(PLUGIN_ID, T.log_player_changedURL, data.url);
                    }
                } catch(e) {
                    console.error(PLUGIN_ID, T.log_player_url_changed_error, e);
                }
            }
            return originalPlay.call(this, data);
        };
        console.log(PLUGIN_ID, T.log_player_intercepted);
    }
    

    var playInterval = setInterval(function(){
        if (Lampa && Lampa.Player && typeof Lampa.Player.play === 'function'){
            clearInterval(playInterval);
            interceptPlayerPlay();
        }
    }, 500);

    var connectionTryCounter = 0;
    var originalTorrserverConnected = Lampa.Torserver.connected;
    var originalTorrserverError = Lampa.Torserver.error;

    function TorserverSwitcher() {
        if(!Lampa || !Lampa.Torserver) {
            console.log(PLUGIN_ID, 'Lampa Torrserver is not found');
            return;
        }
        if(typeof Lampa.Torserver.connected !== 'function' || typeof Lampa.Torserver.error !== 'function') {
            console.log(PLUGIN_ID, 'Invalid Torrserver version');
            return;
        }

        Lampa.Torserver.connected = function (success, fail) { // Оптимизировать, сделать читабельнее. Убрать дубликаты.
            console.log(`MyTORRSERVER connected. `)
            function failRetry() {
                console.log('MyTORRSERVER connected Error');
                if(connectionTryCounter <=2) {
                    switchTorrserver().then(() => {
                        console.log('TorrServer success Switch: ');
                        connectionTryCounter++;
                        return originalTorrserverConnected.call(this, sucessRetry, failRetry);
                    })
                    .catch(() => {
                        console.log('MyTORRSERVER Connection try', connectionTryCounter);
                        connectionTryCounter++;
                        return originalTorrserverConnected.call(this, sucessRetry, failRetry);
                    })
                }
                return originalTorrserverConnected.call(this, success, fail) // На всякий случай
            }
            function sucessRetry() {
                console.log('MyTORRSERVER connected sucessRetry');
                connectionTryCounter = 0;
                return originalTorrserverConnected.call(this, success, fail)
            }
            return originalTorrserverConnected.call(this, () => {
                console.log('MyTORRSERVER connected Success');
                connectionTryCounter = 0;
                return originalTorrserverConnected.call(this, success, fail)
            }, failRetry
            );
        }
        Lampa.Torserver.error = function () {
            if(connectionTryCounter <=2 ) {
                // Посмотреть, как можно оптимизировать и не вызывать ошибку на этапе Connection
                console.log(`MyTORRSERVER Error. Try: `, connectionTryCounter)
            } else {
                console.log('MyTORRSERVER Error Timeout. ');
                connectionTryCounter = 0;
                return originalTorrserverError.call(this);
            }
        }
    }
    TorserverSwitcher();

})();
