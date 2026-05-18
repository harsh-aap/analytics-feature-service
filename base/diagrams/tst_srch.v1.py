from diagrams import Cluster, Diagram
from diagrams.aws.compute import ECS
from diagrams.aws.database import ElastiCache, RDS
from diagrams.aws.network import ELB, Route53
from diagrams.generic.device import Mobile
from diagrams.saas.alerting import Newrelic
from diagrams.onprem.client import Client

graph_attr = {
    "fontsize": "45",
    "bgcolor": "white",
    "splines": "ortho",
    "pad": "0.5",
    "size": "15,15",  # Increase the size to make the graph occupy more space
    "dpi": "400",     # Increase the DPI for higher resolution
    "nodesep": "1", # Increase spacing between nodes
    "ranksep": "1", # Increase spacing between ranks/layers
    "margin": "0.2",
}

node_attr = {
    "fontsize": "20",
    "fontcolor": "black",
    "shape": "box",
}

cluster_attr = {
    "fontsize": "30",
    "fontcolor": "black",
    "style": "filled",
    "shape": "box",
    "pencolor": "gray",
    "margin": "15",
    "penwidth": "2.0",
}
edge_attr = {
    "color": "black",
    "penwidth": "1.5",  # Adjust this value to make the edges bolder
    "arrowhead": "normal",
}

with Diagram("toast architecture", show=False, graph_attr=graph_attr, node_attr=node_attr, direction="TB", edge_attr=edge_attr):
    webView = Client("toast web view")
    freewin_partner = Mobile("freewin")
    us_partner = Mobile("us partner app")
    europe_partner = Mobile("europe partner app")
    dns = Route53("dns \n api.toaststudios.io")
    lb = ELB("lb")

    freewindns = Route53("dns \n api.freewingames.com")
    freewinlb = ELB("lb")

    with Cluster("services", graph_attr=cluster_attr):

            
        with Cluster("free win platform", graph_attr=cluster_attr):
            with Cluster("internet facing api services", graph_attr=cluster_attr):
                appService = ECS("app.service")
            with Cluster("internal services", graph_attr=cluster_attr):
                paymentService = ECS("payment.service")
                userService = ECS("user.service")
                with Cluster("consumers", graph_attr=cluster_attr):
                    userServiceConsumer = ECS("user.service.consumer")

        with Cluster("toast platform", graph_attr=cluster_attr):
            with Cluster("internet facing api services", graph_attr=cluster_attr):
                toastService = ECS("toast.service")
            with Cluster("rummy game", graph_attr=cluster_attr):
                rummyService = ECS("rummy.gameplay")
                rummygameService = ECS("game.service")
                with Cluster("worker", graph_attr=cluster_attr):
                    rummyWorker = ECS("rummy game \nworker(makemaking)")
            with Cluster("black jack game", graph_attr=cluster_attr):
                blackJackService = ECS("blackjack.gameplay")
                bjgameService = ECS("game.service")
                with Cluster("worker", graph_attr=cluster_attr):
                    blackjackWorker = ECS("blackjackWorker game \n worker(makemaking)")
            svc_group = [toastService, rummyService, blackJackService]

            with Cluster("common services", graph_attr=cluster_attr):
                eventService = ECS("event.service")
            
    internal_svc_group = [eventService, paymentService, userService, userServiceConsumer, eventService, blackjackWorker, rummyWorker]

    with Cluster("toast DB Cluster", graph_attr=cluster_attr):
        redis = RDS("redis")
        mongo = RDS("mongo")
        with Cluster("rummy DB Cluster", graph_attr=cluster_attr):
            redis = RDS("redis")
            mongo = RDS("mongo")

        with Cluster("black jack DB Cluster", graph_attr=cluster_attr):
            redis = RDS("redis")
            mongo = RDS("mongo")

    with Cluster("FreeWin DB Cluster", graph_attr=cluster_attr):
        redis = RDS("redis")
        mongo = RDS("mongo")
        postgres = RDS("postgres")
        
    with Cluster("AWS Services", graph_attr=cluster_attr):
        sqs = RDS("sqs")
        kafka = RDS("kafka")



    freewin_partner >> freewindns
    freewin_partner >> webView 
    us_partner >> webView 
    europe_partner >> webView 
    webView >> dns >> lb >> svc_group
    
    freewindns >> freewinlb >> appService
    
    # inter-service communication
    toastService >> rummygameService
    toastService >> bjgameService

    appService >> userService
    appService >> paymentService

    blackjackWorker >> blackJackService
    rummyWorker >> rummyService

    # DB communication
    # svc_group >> redis
    # internal_svc_group >> redis

    # svc_group >> mongo
    # appService >> mongo
    # internal_svc_group >> mongo

    # paymentService >> postgres
    
    # eventService >> kafka
    # rummyService >> kafka
    # blackJackService >> kafka

    # userServiceConsumer << sqs
    # userServiceConsumer >> sqs

