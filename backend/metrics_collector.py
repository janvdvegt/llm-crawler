# collectors.py
from prometheus_client.core import REGISTRY, GaugeMetricFamily


class RedisModelCollector:
    def __init__(self, count_fn, model_types):
        self.count_fn = count_fn
        self.model_types = model_types

    def collect(self):
        g = GaugeMetricFamily(
            "redis_model_count",
            "Number of objects per model type stored in Redis",
            labels=["model"],
        )
        for m in self.model_types:
            # Convert class to string name for the label
            model_name = m.__name__ if hasattr(m, '__name__') else str(m)
            g.add_metric([model_name], float(self.count_fn(m) or 0))
        yield g


class RedisQueueCollector:
    def __init__(self, queue_len_fn, model_types):
        self.queue_len_fn = queue_len_fn
        self.model_types = model_types

    def collect(self):
        g = GaugeMetricFamily(
            "redis_queue_length",
            "Length of a Redis list/queue",
            labels=["model"],
        )
        for m in self.model_types:
            model_name = m.__name__ if hasattr(m, '__name__') else str(m)
            g.add_metric([model_name], float(self.queue_len_fn(model_class=m) or 0))
        yield g
