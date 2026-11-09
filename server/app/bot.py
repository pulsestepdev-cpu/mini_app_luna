"""Telegram-бот: /start, приглашение партнёра, одобрение доступа владельцем."""
from __future__ import annotations

import logging

from aiogram import Bot, Dispatcher, F, Router
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from . import texts
from .config import Settings
from .db import Db

log = logging.getLogger("luna.bot")


class LunaBot:
    def __init__(self, settings: Settings, db: Db):
        self.settings = settings
        self.db = db
        self.bot = Bot(settings.bot_token)
        self.dp = Dispatcher()
        self.username: str | None = None
        self.dp.include_router(self._router())

    # ---------- доступ ----------
    def is_allowed(self, user_id: int) -> bool:
        if user_id == self.settings.admin_id or user_id in self.settings.allowed_ids:
            return True
        row = self.db.user(user_id)
        return bool(row and row["approved"])

    async def request_access(self, user_id: int, name: str, username: str | None) -> None:
        """Один раз сообщить владельцу о новом пользователе — с кнопками «Разрешить / Отклонить»."""
        row = self.db.user(user_id)
        if row and row["requested"]:
            return
        self.db.set_flag(user_id, "requested")
        if not self.settings.admin_id:
            return
        kb = InlineKeyboardMarkup(
            inline_keyboard=[[
                InlineKeyboardButton(text="✅ Разрешить", callback_data=f"approve:{user_id}"),
                InlineKeyboardButton(text="✖️ Отклонить", callback_data=f"deny:{user_id}"),
            ]]
        )
        await self.send(self.settings.admin_id, texts.access_request(name, user_id, username), markup=kb)

    # ---------- отправка ----------
    def app_keyboard(self) -> InlineKeyboardMarkup | None:
        if not self.settings.webapp_url:
            return None
        return InlineKeyboardMarkup(
            inline_keyboard=[[InlineKeyboardButton(text="Открыть LUNA", web_app=WebAppInfo(url=self.settings.webapp_url))]]
        )

    async def send(self, chat_id: int, text: str, app_button: bool = False, markup: InlineKeyboardMarkup | None = None) -> bool | None:
        """True — отправлено, False — пользователь закрыл боту личку (не повторяем), None — временная ошибка."""
        try:
            await self.bot.send_message(chat_id, text, reply_markup=markup or (self.app_keyboard() if app_button else None))
            return True
        except TelegramForbiddenError:
            self.db.set_flag(chat_id, "started", False)
            return False
        except TelegramBadRequest as e:
            log.warning("bad request for %s: %s", chat_id, e)
            return False
        except Exception as e:  # сеть и т. п. — попробуем в следующую минуту
            log.warning("send failed for %s: %s", chat_id, e)
            return None

    # ---------- обработчики ----------
    def _router(self) -> Router:
        r = Router()

        @r.message(CommandStart())
        async def start(msg: Message, command: CommandObject) -> None:
            u = msg.from_user
            if not u:
                return
            self.db.ensure_user(u.id, u.first_name or "")
            self.db.set_flag(u.id, "started")
            arg = (command.args or "").strip()

            if arg.startswith("p_"):  # приглашение партнёра
                owner_id = self.db.link_partner(arg[2:], u.id, u.first_name or "Партнёр")
                if owner_id is None:
                    await msg.answer("Эта ссылка-приглашение уже не действует. Попроси прислать новую ♡")
                    return
                owner = self.db.user(owner_id)
                await msg.answer(texts.partner_welcome((owner["first_name"] if owner else "") or "Она"))
                await self.send(owner_id, texts.partner_linked_for_owner(u.first_name or "Партнёр"))
                return

            if self.is_allowed(u.id):
                await msg.answer(texts.welcome(u.first_name or ""), reply_markup=self.app_keyboard())
            else:
                await msg.answer(texts.private_bot())
                await self.request_access(u.id, u.first_name or "", u.username)

        @r.message(Command("stop"))
        async def stop(msg: Message) -> None:
            u = msg.from_user
            if not u:
                return
            owner_id = self.db.owner_of_partner(u.id)
            if owner_id is None:
                await msg.answer("Ты не подписан на подсказки партнёру.")
                return
            self.db.unlink_partner(owner_id)
            await msg.answer(texts.partner_unlinked())
            await self.send(owner_id, texts.partner_left_for_owner(u.first_name or "Партнёр"))

        @r.callback_query(F.data.startswith("approve:") | F.data.startswith("deny:"))
        async def decide(cb: CallbackQuery) -> None:
            if not cb.from_user or cb.from_user.id != self.settings.admin_id or not cb.data:
                await cb.answer("Только для владельца")
                return
            action, raw = cb.data.split(":", 1)
            user_id = int(raw)
            if action == "approve":
                self.db.set_flag(user_id, "approved")
                await self.send(user_id, texts.access_granted(), app_button=True)
                note = "✅ Доступ открыт"
            else:
                note = "✖️ Отклонено"
            if isinstance(cb.message, Message):
                await cb.message.edit_text(f"{cb.message.text}\n\n{note}")
            await cb.answer(note)

        return r
