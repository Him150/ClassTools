'use client';
import { useEffect, useState } from 'react';
import { Skeleton, Image } from '@heroui/react';
import { getConfigSync } from '@renderer/features/ipc/config';
import { getXiaomiWeatherName, getXiaomiWeatherIcon, timeIsNight } from '@renderer/features/weather/convertor';
import { fetchTotalWeather } from '@renderer/features/weather/xiaomiWeather';
import { WeatherData } from '@renderer/features/weather/xiaomiWeatherTypes';

export function Weather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [showFeelslike, setShowFeelslike] = useState(true);

  useEffect(() => {
    let timer: any;
    (async () => {
      const useWeather = (await getConfigSync('features.weather.enable')) ?? false;
      setEnabled(Boolean(useWeather));
      if (!Boolean(useWeather)) return;

      const fetchWeather = async (force = false) => {
        const useWeather = (await getConfigSync('features.weather.enable')) ?? false;
        setEnabled(Boolean(useWeather));
        if (!Boolean(useWeather)) return;

        const showWeatherFeelslike = (await getConfigSync('features.weather.showFeelslike')) ?? true;
        setShowFeelslike(Boolean(showWeatherFeelslike));

        let requestLocation = (await getConfigSync('features.weather.locationKey')) ?? 'weathercn:101010100';

        try {
          setLoading(true);

          // 使用缓存
          if (!force && localStorage.getItem('weatherFull')) {
            const weatherFull: { data: any; location: string; updateTime: number } = JSON.parse(
              localStorage.getItem('weatherFull'),
            );
            if (
              weatherFull.location === requestLocation &&
              weatherFull?.updateTime + 10 * 60 * 1000 > Date.now() &&
              weatherFull?.data?.current
            ) {
              setWeather(weatherFull?.data);
              return;
            }
          }

          const weatherData = await fetchTotalWeather(requestLocation);
          console.log(weatherData);

          if (weatherData?.current) {
            localStorage.setItem(
              'weatherFull',
              JSON.stringify({ data: weatherData, location: requestLocation, updateTime: Date.now() }),
            );
            setWeather(weatherData);
          } else {
            alert('天气获取失败: 配置错误');
          }
        } catch (error) {
          setWeather(null);
        } finally {
          setLoading(false);
        }
      };

      fetchWeather();
      timer = setInterval(() => fetchWeather(), 5000);
    })();

    return () => timer && clearInterval(timer);
  }, []);

  const handleClick = () => {
    window.open('/weather', '_blank', 'width=1000,height=700,resizable=yes');
  };

  if (!enabled) return;

  if (loading || !weather?.current) {
    return <Skeleton className='w-28 h-10 rounded-lg' />;
  }

  // 判断是否是夜间
  const isNight = timeIsNight(weather.forecastDaily.sunRiseSet.value);

  const weatherName = getXiaomiWeatherName(Number(weather.current.weather));
  const weatherIcon = getXiaomiWeatherIcon(Number(weather.current.weather), isNight);

  return (
    <div
      className='flex gap-1 items-center bg-primary-400 text-primary-foreground px-3 py-2 rounded-lg cursor-pointer select-none'
      onClick={handleClick}>
      {weatherIcon && (
        <Image
          src={`/static/weatherIcons/${weatherIcon}.webp`}
          radius='none'
          className='w-[1.5em] shrink-0'
          removeWrapper={true}
          draggable={false}></Image>
      )}
      <span className='whitespace-nowrap'>
        {`${weatherName ? `${weatherName} ` : ''}${weather.current.temperature.value}°`}
      </span>
      {showFeelslike && (
        <span className='text-[0.875em] text-gray-300 hidden min-[20em]:inline whitespace-nowrap'>
          体感 {weather.current.feelsLike.value}°
        </span>
      )}
    </div>
  );
}
