(function() {
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
            noty_both_unavailable: 'TorrServer недоступен ❌'
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
            noty_both_unavailable: 'TorrServer unavailable ❌'
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
    
    function checkServer(url) {
        var controller = new AbortController();
        var signal = controller.signal;
    
        var checkServerTimeoutId = setTimeout(() => {
            controller.abort();
        }, 5000);
    
        return fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            signal: signal
        })
        .then(() => {
            clearTimeout(checkServerTimeoutId);
            return true;
        })
        .catch(() => {
            clearTimeout(checkServerTimeoutId);
            return false;
        });
    }
    
    function switchTorrserver() {
        var primaryURL = getSetting('torrserver_url');
        var secondaryURL = getSetting('torrserver_url_two');
        var currentLink = getSetting('torrserver_use_link');

        if (!primaryURL || !secondaryURL) {
            log(T.log_links_not_configured);
            return;
        }

        log(T.log_check_primary);
        checkServer(primaryURL).then(isPrimaryAlive => {
            if (isPrimaryAlive) {
                if (currentLink !== 'one') {
                    setSetting('torrserver_use_link', 'one');
                    Lampa.Noty.show(T.noty_primary);
                }
                if(isLastCheckUnavailableAll) Lampa.Noty.show(T.noty_primary_available_again);
                log(T.log_primary_available);
                isLastCheckUnavailableAll = false;
            } else {
                log(T.log_primary_unavailable);
                checkServer(secondaryURL).then(isSecondaryAlive => {
                    if (isSecondaryAlive) {
                        if (currentLink !== 'two') {
                            setSetting('torrserver_use_link', 'two');
                            Lampa.Noty.show(T.noty_secondary);
                        }
                        if(isLastCheckUnavailableAll) Lampa.Noty.show(T.noty_secondary_available_again);
                        log(T.log_switch_secondary);
                        isLastCheckUnavailableAll = false;
                    } else {
                        log(T.log_both_unavailable);
                        if(!isLastCheckUnavailableAll) {
                            isLastCheckUnavailableAll = true;
                            Lampa.Noty.show(T.noty_both_unavailable);
                        }
                        
                    }
                });
            }
        });
    }

    setInterval(switchTorrserver, 60 * 1000);
    switchTorrserver();
    log(T.log_plugin_loaded);
})();
