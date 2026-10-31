// Every page group's translations, merged (later groups win on duplicates).
import * as core from './core';
import * as admin from './admin';
import * as admin_stores from './admin_stores';
import * as owner from './owner';
import * as customer from './customer';
import * as shared_ui from './shared_ui';
import * as wallets_driver from './wallets_driver';
import * as orders_auth from './orders_auth';
import * as errors from './errors';
import * as wallet from './wallet';
import { tr as turkish } from './turkish';
import { it as italian } from './italian';

export const englishTexts: Record<string, string> = Object.assign({}, core.en, admin.en, admin_stores.en, owner.en, customer.en, shared_ui.en, wallets_driver.en, orders_auth.en, errors.en, wallet.en);

export const russianTexts: Record<string, string> = Object.assign({}, core.ru, admin.ru, admin_stores.ru, owner.ru, customer.ru, shared_ui.ru, wallets_driver.ru, orders_auth.ru, errors.ru, wallet.ru);

export const turkishTexts: Record<string, string> = turkish;

export const italianTexts: Record<string, string> = italian;
