CHORE_TEMPLATES = [
    # Daily chores - morning
    {"title": "Make Bed", "emoji": "\U0001f6cf\ufe0f", "description": "Make your bed neatly", "value": 10, "frequency": "daily", "time_of_day": "morning"},
    {"title": "Brush Teeth", "emoji": "\U0001f9b7", "description": "Brush teeth morning and night", "value": 5, "frequency": "daily", "time_of_day": "morning"},
    {"title": "Get Dressed", "emoji": "\U0001f455", "description": "Get dressed by yourself", "value": 5, "frequency": "daily", "time_of_day": "morning"},
    {"title": "Pack Lunch Box", "emoji": "\U0001f371", "description": "Pack your school lunch", "value": 10, "frequency": "daily", "time_of_day": "morning"},
    {"title": "Unpack School Bag", "emoji": "\U0001f392", "description": "Unpack school bag and put things away", "value": 5, "frequency": "daily", "time_of_day": "morning"},

    # Daily chores - evening
    {"title": "Set the Table", "emoji": "\U0001f37d\ufe0f", "description": "Set the dinner table", "value": 5, "frequency": "daily", "time_of_day": "evening"},
    {"title": "Clear the Table", "emoji": "\U0001f9f9", "description": "Clear dishes after dinner", "value": 5, "frequency": "daily", "time_of_day": "evening"},
    {"title": "Do the Dishes", "emoji": "\U0001fad7", "description": "Wash or load the dishwasher", "value": 15, "frequency": "daily", "time_of_day": "evening"},

    # Daily chores - anytime
    {"title": "Feed Pet", "emoji": "\U0001f415", "description": "Feed and water the pet", "value": 10, "frequency": "daily", "time_of_day": "anytime"},
    {"title": "Tidy Room", "emoji": "\U0001f9f8", "description": "Put toys and clothes away", "value": 15, "frequency": "daily", "time_of_day": "anytime"},
    {"title": "Do Homework", "emoji": "\U0001f4da", "description": "Complete all homework", "value": 20, "frequency": "daily", "time_of_day": "anytime"},
    {"title": "Read for 20 Minutes", "emoji": "\U0001f4d6", "description": "Read a book for 20 minutes", "value": 10, "frequency": "daily", "time_of_day": "anytime"},
    {"title": "Put Away Toys", "emoji": "\U0001f3b2", "description": "Put all toys back where they belong", "value": 10, "frequency": "daily", "time_of_day": "anytime"},

    # Weekly chores (with times_per_week)
    {"title": "Vacuum Room", "emoji": "\U0001f9f9", "description": "Vacuum your bedroom floor", "value": 30, "frequency": "weekly", "times_per_week": 1},
    {"title": "Clean Bathroom", "emoji": "\U0001f6bf", "description": "Wipe sink, mirror, and toilet", "value": 40, "frequency": "weekly", "times_per_week": 1},
    {"title": "Take Out Bins", "emoji": "\U0001f5d1\ufe0f", "description": "Take the bins out to the curb", "value": 20, "frequency": "weekly", "times_per_week": 1},
    {"title": "Mow the Lawn", "emoji": "\U0001f331", "description": "Mow the front or back lawn", "value": 50, "frequency": "weekly", "times_per_week": 1},
    {"title": "Wash the Car", "emoji": "\U0001f697", "description": "Help wash the car", "value": 50, "frequency": "weekly", "times_per_week": 1},
    {"title": "Do Laundry", "emoji": "\U0001f455", "description": "Wash, dry, and fold clothes", "value": 30, "frequency": "weekly", "times_per_week": 2},
    {"title": "Water the Plants", "emoji": "\U0001fab4", "description": "Water all the indoor and outdoor plants", "value": 20, "frequency": "weekly", "times_per_week": 3},
    {"title": "Tidy Garage", "emoji": "\U0001f3e0", "description": "Help tidy up the garage", "value": 40, "frequency": "weekly", "times_per_week": 1},
    {"title": "Wipe Kitchen Surfaces", "emoji": "\U0001f9fd", "description": "Wipe down all kitchen counters", "value": 20, "frequency": "weekly", "times_per_week": 3},
    {"title": "Organise Wardrobe", "emoji": "\U0001f45a", "description": "Fold and organise your wardrobe", "value": 30, "frequency": "weekly", "times_per_week": 1},
]


def get_templates():
    return CHORE_TEMPLATES
