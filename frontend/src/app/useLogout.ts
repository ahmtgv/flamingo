import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLogoutMutation } from '@/entities/graphql/generated';
import { clearSession } from '@/shared/lib/session';

import { useAppDispatch } from './hooks';
import { setAgeMode } from './uiSlice';

/**
 * Выйти: погасить сессию на сервере, стереть её здесь, забыть кэш и уйти на вход.
 *
 * 🔴 СЕРВЕРНАЯ ПОЛОВИНА ЗДЕСЬ ОТСУТСТВОВАЛА (найдено аудитом 17.08). `clearSession()` убирает
 * refresh-токен из этого браузера — и только. Сам токен оставался действительным все
 * четырнадцать дней, то есть любая его копия открывала кабинет после «выхода». Мутация
 * `logout` (она поднимает `token_version` и гасит все выданные токены разом) существовала
 * и не вызывалась ни одним экраном.
 *
 * ⚠️ Порядок важен: сначала сервер, потом местная очистка. Наоборот — и мутация уйдёт уже
 * без заголовка, то есть в никуда.
 *
 * ⚠️ Отказ сервера не задерживает человека: он нажал «Выйти» и должен выйти. Но местная
 * очистка идёт в любом случае, поэтому «вышел, а токен жив» превращается в «вышел здесь,
 * токен умрёт по истечении» — это хуже, чем сейчас, но лучше, чем не выпустить.
 */
export function useLogout() {
  const client = useApolloClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logoutOnServer] = useLogoutMutation();

  return useCallback(async () => {
    await logoutOnServer().catch(() => undefined);
    clearSession();
    dispatch(setAgeMode('default'));
    await client.clearStore();
    navigate('/login', { replace: true });
  }, [client, dispatch, navigate, logoutOnServer]);
}
