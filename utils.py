from datetime import datetime, timedelta, timezone

def get_current_time_jst():
    t_delta = timedelta(hours=9)  # 日本の時差
    JST = timezone(t_delta, 'JST')
    return datetime.now(JST)