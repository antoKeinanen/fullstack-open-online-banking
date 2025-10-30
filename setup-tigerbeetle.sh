docker run --security-opt seccomp=unconfined \
     -v $(pwd)/docker-data/tigerbeetle:/data ghcr.io/tigerbeetle/tigerbeetle \
    format --cluster=0 --replica=0 --replica-count=1 /data/0_0.tigerbeetle