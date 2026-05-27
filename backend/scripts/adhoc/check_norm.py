import re
def _norm_lawyer(name: str) -> str:
    if not name:
        return ""
    s = str(name).strip()
    if "Ахатов А.А" in s:
        s = "Ахатов А.Б"
    s = s.lower()
    s = s.replace("і", "и").replace("ң", "н").replace("қ", "к").replace("ғ", "г").replace("ү", "у").replace("ұ", "у").replace("ә", "а").replace("ө", "о")
    s = re.sub(r"\.", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    parts = s.split()
    if not parts:
        return ""
    surname = parts[0]
    initials = "".join(p[0] for p in parts[1:3] if p)
    return f"{surname} {initials}".strip()

print("DB full name:", _norm_lawyer("Сырлыбаев Ержан Елтайұлы"))
print("Excel name:", _norm_lawyer("Сырлыбаев Е."))
