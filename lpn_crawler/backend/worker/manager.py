# -*- coding: utf-8 -*-
import asyncio
from typing import Optional

class CrawlJobManager:
    """
    Manager singleton quản lý Single Active Job Lock và Cancellation Token
    cho single-process backend.
    """
    _instance: Optional['CrawlJobManager'] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CrawlJobManager, cls).__new__(cls)
            cls._instance._active_job_id = None
            cls._instance._cancellation_token = asyncio.Event()
            cls._instance._cancelled_job_ids = set()
            cls._instance._lock = asyncio.Lock()
            cls._instance._is_paused = False
            cls._instance._is_sync_mode = False
        return cls._instance

    def set_sync_mode(self, job_id: int, is_sync: bool):
        self._is_sync_mode = bool(is_sync)

    def is_sync_mode(self, job_id: Optional[int] = None) -> bool:
        if job_id is not None and self._active_job_id is not None:
            if str(self._active_job_id) != str(job_id):
                return False
        return getattr(self, '_is_sync_mode', False)

    def pause_job(self, job_id: int) -> bool:
        if self._active_job_id is None or str(self._active_job_id) == str(job_id):
            self._is_paused = True
            return True
        return False

    def resume_job(self, job_id: int) -> bool:
        if self._active_job_id is None or str(self._active_job_id) == str(job_id):
            self._is_paused = False
            return True
        return False

    def is_paused(self, job_id: Optional[int] = None) -> bool:
        if job_id is not None and self._active_job_id is not None:
            if str(self._active_job_id) != str(job_id):
                return False
        return getattr(self, '_is_paused', False)

    async def acquire_job_lock(self, job_id: int) -> bool:
        """
        Khóa duy nhất cho 1 active crawl job.
        Trả về True nếu thu thập khóa thành công, False nếu đang có job khác RUNNING (HTTP 409).
        """
        async with self._lock:
            if self._active_job_id is not None and str(self._active_job_id) != str(job_id):
                return False
            self._active_job_id = job_id
            self._cancellation_token.clear()
            self._cancelled_job_ids.discard(str(job_id))
            self._is_paused = False
            self._is_sync_mode = False
            return True

    async def release_job_lock(self, job_id: int):
        """
        Giải phóng khóa job
        """
        async with self._lock:
            if str(self._active_job_id) == str(job_id) or self._active_job_id is None:
                self._active_job_id = None
                self._is_paused = False
                self._is_sync_mode = False

    def release_job_lock_sync(self, job_id: int):
        """
        Giải phóng khóa job đồng bộ cho worker thread
        """
        if str(self._active_job_id) == str(job_id) or self._active_job_id is None:
            self._active_job_id = None
            self._is_paused = False
            self._is_sync_mode = False

    def acquire_job_lock_sync(self, job_id: int) -> bool:
        """
        Thu thập khóa job đồng bộ cho worker thread
        """
        if self._active_job_id is not None and str(self._active_job_id) != str(job_id):
            return False
        self._active_job_id = job_id
        self._cancellation_token.clear()
        self._cancelled_job_ids.discard(str(job_id))
        self._is_paused = False
        return True

    def reset_cancel_flag(self):
        """
        Reset hoàn toàn cờ hủy về trạng thái chưa bị hủy
        """
        self._cancellation_token.clear()
        self._cancelled_job_ids.clear()

    def request_stop(self, job_id: int) -> bool:
        """
        Phát tín hiệu hủy job đang chạy qua cancellation token
        """
        self._cancelled_job_ids.add(str(job_id))
        self._cancellation_token.set()
        return True

    def is_cancelled(self, job_id: Optional[int] = None) -> bool:
        """
        Kiểm tra xem job có nhận được tín hiệu hủy không.
        """
        if job_id is not None and str(job_id) in self._cancelled_job_ids:
            return True
        return self._cancellation_token.is_set()

    def get_cancellation_token(self) -> asyncio.Event:
        return self._cancellation_token

    def get_active_job_id(self) -> Optional[int]:
        return self._active_job_id

crawl_job_manager = CrawlJobManager()
