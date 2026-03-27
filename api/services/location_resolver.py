from api.models.news import NewsIngestPayload, NewsLocation

COUNTRY_COORDINATES: dict[str, tuple[str, float, float]] = {
    "australia": ("Asia Pacific", -35.2809, 149.13),
    "brazil": ("Latin America", -15.7939, -47.8828),
    "canada": ("North America", 45.4215, -75.6972),
    "chile": ("Latin America", -33.4489, -70.6693),
    "china": ("Asia Pacific", 39.9042, 116.4074),
    "egypt": ("Middle East & Africa", 30.0444, 31.2357),
    "france": ("Europe", 48.8566, 2.3522),
    "germany": ("Europe", 52.52, 13.405),
    "india": ("Asia Pacific", 28.6139, 77.209),
    "indonesia": ("Asia Pacific", -6.2088, 106.8456),
    "iran": ("Middle East & Africa", 35.6892, 51.389),
    "iraq": ("Middle East & Africa", 33.3152, 44.3661),
    "israel": ("Middle East & Africa", 31.7683, 35.2137),
    "italy": ("Europe", 41.9028, 12.4964),
    "japan": ("Asia Pacific", 35.6762, 139.6503),
    "mexico": ("Latin America", 19.4326, -99.1332),
    "palestine": ("Middle East & Africa", 31.9522, 35.2332),
    "russia": ("Europe", 55.7558, 37.6173),
    "saudi arabia": ("Middle East & Africa", 24.7136, 46.6753),
    "south africa": ("Middle East & Africa", -25.7479, 28.2293),
    "south korea": ("Asia Pacific", 37.5665, 126.978),
    "spain": ("Europe", 40.4168, -3.7038),
    "sudan": ("Middle East & Africa", 15.5007, 32.5599),
    "syria": ("Middle East & Africa", 33.5138, 36.2765),
    "taiwan": ("Asia Pacific", 25.033, 121.5654),
    "turkey": ("Europe", 39.9334, 32.8597),
    "ukraine": ("Europe", 50.4501, 30.5234),
    "united arab emirates": ("Middle East & Africa", 24.4539, 54.3773),
    "united kingdom": ("Europe", 51.5072, -0.1276),
    "united states": ("North America", 38.9072, -77.0369),
}

KEYWORD_ALIASES: dict[str, str] = {
    "america": "united states",
    "u.s.": "united states",
    "u.s": "united states",
    "usa": "united states",
    "washington": "united states",
    "britain": "united kingdom",
    "uk": "united kingdom",
    "london": "united kingdom",
    "england": "united kingdom",
    "seoul": "south korea",
    "tokyo": "japan",
    "beijing": "china",
    "taipei": "taiwan",
    "moscow": "russia",
    "kyiv": "ukraine",
    "kiev": "ukraine",
    "berlin": "germany",
    "paris": "france",
    "rome": "italy",
    "madrid": "spain",
    "cairo": "egypt",
    "riyadh": "saudi arabia",
    "dubai": "united arab emirates",
    "abu dhabi": "united arab emirates",
    "tehran": "iran",
    "baghdad": "iraq",
    "jerusalem": "israel",
    "tel aviv": "israel",
    "gaza": "palestine",
    "khartoum": "sudan",
    "damascus": "syria",
    "santiago": "chile",
    "brasilia": "brazil",
    "ottawa": "canada",
    "canberra": "australia",
    "new delhi": "india",
    "jakarta": "indonesia",
    "mexico city": "mexico",
}

REGION_DEFAULTS: dict[str, tuple[float, float]] = {
    "asia pacific": (1.3521, 103.8198),
    "europe": (50.8503, 4.3517),
    "latin america": (8.9824, -79.5199),
    "middle east & africa": (24.7136, 46.6753),
    "north america": (38.9072, -77.0369),
}


def _lookup_country(country: str | None) -> tuple[str | None, NewsLocation | None]:
    if not country:
        return None, None

    key = country.strip().lower()
    if key in COUNTRY_COORDINATES:
        region, lat, lng = COUNTRY_COORDINATES[key]
        return region, NewsLocation(lat=lat, lng=lng)

    return None, None


def _infer_country_from_text(payload: NewsIngestPayload) -> str | None:
    haystack = " ".join(
        [
            payload.title,
            payload.summary,
            payload.raw_content,
            payload.source,
            payload.country or "",
            payload.region or "",
            " ".join(payload.tags),
        ]
    ).lower()

    for keyword, canonical_country in KEYWORD_ALIASES.items():
        if keyword in haystack:
            return canonical_country.title() if canonical_country != "united states" else "United States"

    for country in COUNTRY_COORDINATES:
        if country in haystack:
            return country.title() if country != "united states" else "United States"

    return None


def _region_default(region: str | None) -> NewsLocation | None:
    if not region:
        return None

    default = REGION_DEFAULTS.get(region.strip().lower())
    if not default:
        return None

    return NewsLocation(lat=default[0], lng=default[1])


def resolve_location(payload: NewsIngestPayload) -> NewsIngestPayload:
    if payload.location:
        inferred_region, _ = _lookup_country(payload.country)
        return payload.model_copy(update={"region": payload.region or inferred_region})

    inferred_country = payload.country or _infer_country_from_text(payload)
    inferred_region, inferred_location = _lookup_country(inferred_country)

    if inferred_location:
        return payload.model_copy(
            update={
                "country": payload.country or inferred_country,
                "region": payload.region or inferred_region,
                "location": inferred_location,
            }
        )

    region_location = _region_default(payload.region)
    if region_location:
        return payload.model_copy(update={"location": region_location})

    return payload
