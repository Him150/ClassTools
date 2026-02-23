'use client';
import { useEffect, useState, useRef } from 'react';
import { Switch, Autocomplete, AutocompleteItem } from '@heroui/react';
import { SettingsGroup, SettingsItem } from '@renderer/components/settings/SettingsGroup';
import { getConfigSync } from '@renderer/features/ipc/config';
import { fetchCityList } from '@renderer/features/weather/xiaomiWeather';
import { MapPinIcon } from '@heroicons/react/24/outline';

export default function App() {
  const [useWeather, setUseWeather] = useState(false);
  const [showWeatherFeelslike, setShowWeatherFeelslike] = useState(false);
  const [location, setLocation] = useState<{ key: string; label: string } | null>(null);
  const [cityList, setCityList] = useState<{ key: string; label: string }[]>([]);
  const isFirstRender = useRef(true);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    (async () => {
      const weatherEnabled = await getConfigSync('features.weather.enable');
      weatherEnabled && setUseWeather(Boolean(weatherEnabled));
      const showWeatherFeelslike = (await getConfigSync('features.weather.showFeelslike')) ?? true;
      showWeatherFeelslike && setShowWeatherFeelslike(Boolean(showWeatherFeelslike));

      const savedLocationKey = await getConfigSync('features.weather.locationKey');
      const savedLocationLabel = await getConfigSync('features.weather.locationLabel');
      if (savedLocationKey && savedLocationLabel) {
        setCityList([{ key: savedLocationKey, label: savedLocationLabel }]);
        setLocation({ key: savedLocationKey, label: savedLocationLabel });
      }
    })();
  }, []);

  const fetchCities = async (query: string) => {
    setLoadingCities(true);
    try {
      const res = await fetchCityList(query, 'zh_cn');
      const formatted = res.map(city => ({
        key: city.locationKey,
        label: `${city.name} - ${city.affiliation}`,
      }));
      setCityList(formatted);
    } catch (err) {
      console.error('获取城市列表失败:', err);
    } finally {
      setLoadingCities(false);
    }
  };

  return (
    <SettingsGroup title='天气' icon={<MapPinIcon className='w-6 h-6'></MapPinIcon>}>
      <SettingsItem title='启用天气' description='开启显示天气功能'>
        <Switch
          isSelected={useWeather}
          onChange={() => {
            const newValue = !useWeather;
            setUseWeather(newValue);
            window.ipc?.send('set-config', 'features.weather.enable', newValue);
          }}
        />
      </SettingsItem>

      {useWeather && (
        <>
          <SettingsItem title='选择位置'>
            <Autocomplete
              items={cityList}
              selectedKey={location?.key}
              onSelectionChange={key => {
                const selected = cityList.find(c => c.key === key);
                if (selected) {
                  setLocation(selected);
                  window.ipc?.send('set-config', 'features.weather.locationKey', selected.key);
                  window.ipc?.send('set-config', 'features.weather.locationLabel', selected.label);
                }
              }}
              onInputChange={query => {
                if (isFirstRender.current) {
                  isFirstRender.current = false;
                  return;
                }
                if (query.length >= 2) fetchCities(query);
              }}
              isLoading={loadingCities}>
              {item => <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>}
            </Autocomplete>
          </SettingsItem>
          <SettingsItem title='显示体感温度'>
            <Switch
              isSelected={showWeatherFeelslike}
              onChange={() => {
                const newValue = !showWeatherFeelslike;
                setShowWeatherFeelslike(newValue);
                window.ipc?.send('set-config', 'features.weather.showFeelslike', newValue);
              }}
            />
          </SettingsItem>
        </>
      )}
    </SettingsGroup>
  );
}
